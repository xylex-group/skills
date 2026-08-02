// hooks/src/prompt-analysis.mts
import { searchSkills } from "./lexical-index.mjs";
import { parseSeenSkills } from "./patterns.mjs";
import {
  compilePromptSignals,
  matchPromptWithReason,
  normalizePromptText,
  scorePromptWithLexical
} from "./prompt-patterns.mjs";
function parseLikelySkillsEnv(envValue = process.env.XYLEX_PLUGIN_LIKELY_SKILLS) {
  if (typeof envValue !== "string" || envValue.trim() === "") {
    return /* @__PURE__ */ new Set();
  }
  return new Set(
    envValue.split(",").map((skill) => skill.trim()).filter((skill) => skill.length > 0)
  );
}
function analyzePrompt(prompt, skillMap, seenSkills, budgetBytes, maxSkills, options) {
  const t0 = performance.now();
  const lexicalEnabled = options?.lexicalEnabled ?? false;
  const likelySkills = options?.likelySkills ? new Set(
    [...options.likelySkills].map((skill) => String(skill).trim()).filter((skill) => skill.length > 0)
  ) : parseLikelySkillsEnv();
  const normalizedPrompt = normalizePromptText(prompt);
  const dedupOff = process.env.XYLEX_PLUGIN_HOOK_DEDUP === "off";
  const hasEnvVar = typeof seenSkills === "string";
  const strategy = dedupOff ? "disabled" : hasEnvVar ? "env-var" : "memory-only";
  const seenSet = dedupOff ? /* @__PURE__ */ new Set() : parseSeenSkills(seenSkills);
  const lexicalHits = lexicalEnabled ? searchSkills(prompt) : [];
  const lexicalScoreMap = new Map(lexicalHits.map((h) => [h.skill, h.score]));
  const LEXICAL_BOOST_CAP = 4;
  const RETRIEVAL_LEXICAL_BOOST_CAP = 8;
  const RETRIEVAL_TOP_K = 5;
  const topKLexicalSkills = new Set(
    lexicalHits.slice(0, RETRIEVAL_TOP_K).map((h) => h.skill)
  );
  const perSkillResults = {};
  const matched = [];
  for (const [skill, config] of Object.entries(skillMap)) {
    const hasPromptSignals = !!config.promptSignals;
    if (!hasPromptSignals) {
      continue;
    }
    const compiled = hasPromptSignals ? compilePromptSignals(config.promptSignals) : void 0;
    if (lexicalEnabled) {
      const exactResult = compiled ? matchPromptWithReason(normalizedPrompt, compiled) : { matched: false, reason: "no promptSignals", score: 0 };
      if (exactResult.score === Number.NEGATIVE_INFINITY) {
        perSkillResults[skill] = {
          matched: false,
          reason: exactResult.reason,
          score: Number.NEGATIVE_INFINITY,
          suppressed: true
        };
        continue;
      }
      const minScore = compiled?.minScore ?? 6;
      const rawLexical = lexicalScoreMap.get(skill) ?? 0;
      if (exactResult.matched) {
        perSkillResults[skill] = {
          matched: true,
          reason: exactResult.reason,
          score: exactResult.score,
          suppressed: false
        };
        matched.push({
          priority: config.priority,
          score: exactResult.score,
          skill
        });
      } else {
        const allowLexicalOnlyRecall = exactResult.score <= 0 && rawLexical > 0 && topKLexicalSkills.has(skill) && likelySkills.has(skill);
        if (!(rawLexical > 0 && (exactResult.score > 0 || allowLexicalOnlyRecall))) {
          perSkillResults[skill] = {
            matched: false,
            reason: exactResult.reason,
            score: exactResult.score,
            suppressed: false
          };
          continue;
        }
        const lexResult = scorePromptWithLexical(
          prompt,
          skill,
          compiled,
          lexicalHits
        );
        const isRetrievalRecall = allowLexicalOnlyRecall;
        const boostCap = isRetrievalRecall ? RETRIEVAL_LEXICAL_BOOST_CAP : LEXICAL_BOOST_CAP;
        const lexicalBoost = Math.min(
          Math.max(lexResult.score - exactResult.score, 0),
          boostCap
        );
        const effectiveScore = exactResult.score + lexicalBoost;
        const isMatched = effectiveScore >= minScore;
        const parts = [];
        if (exactResult.score > 0) {
          parts.push(exactResult.reason);
        }
        parts.push(
          `lexical ${isMatched ? "recall" : "boost"} (raw ${rawLexical.toFixed(1)}, capped +${lexicalBoost.toFixed(1)}, source: ${lexResult.source})`
        );
        const reason = parts.join("; ");
        perSkillResults[skill] = {
          matched: isMatched,
          reason,
          score: effectiveScore,
          suppressed: false
        };
        if (isMatched) {
          matched.push({
            priority: config.priority,
            score: effectiveScore,
            skill
          });
        }
      }
    } else {
      const result = matchPromptWithReason(normalizedPrompt, compiled);
      perSkillResults[skill] = {
        matched: result.matched,
        reason: result.reason,
        score: result.score,
        suppressed: result.score === Number.NEGATIVE_INFINITY
      };
      if (result.matched) {
        matched.push({ priority: config.priority, score: result.score, skill });
      }
    }
  }
  matched.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.skill.localeCompare(b.skill);
  });
  const filteredByDedup = [];
  const afterDedup = matched.filter((m) => {
    if (!dedupOff && seenSet.has(m.skill)) {
      filteredByDedup.push(m.skill);
      return false;
    }
    return true;
  });
  const selected = afterDedup.slice(0, maxSkills);
  const droppedByCap = afterDedup.slice(maxSkills).map((m) => m.skill);
  const selectedSkills = selected.map((m) => m.skill);
  const droppedByBudget = [];
  let usedBytes = 0;
  const finalSelected = [];
  for (const skill of selectedSkills) {
    const config = skillMap[skill];
    const estimatedSize = config?.summary ? Math.max(config.summary.length * 10, 500) : 500;
    if (usedBytes + estimatedSize > budgetBytes && finalSelected.length > 0) {
      droppedByBudget.push(skill);
    } else {
      usedBytes += estimatedSize;
      finalSelected.push(skill);
    }
  }
  const timingMs = Math.round(performance.now() - t0);
  return {
    budgetBytes,
    dedupState: {
      filteredByDedup,
      seenSkills: [...seenSet],
      strategy
    },
    droppedByBudget,
    droppedByCap,
    normalizedPrompt,
    perSkillResults,
    selectedSkills: finalSelected,
    timingMs
  };
}
export {
  analyzePrompt
};
