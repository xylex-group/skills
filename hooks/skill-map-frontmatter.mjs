// hooks/src/skill-map-frontmatter.mts
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { safeReadFile } from "./hook-env.mjs";

function extractFrontmatter(markdown) {
  let src = markdown;
  if (src.charCodeAt(0) === 65_279) {
    src = src.slice(1);
  }
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    return { body: src, yaml: "" };
  }
  return { body: match[2], yaml: match[1] };
}
function invalidYaml(message, lineNumber) {
  const location =
    typeof lineNumber === "number" ? ` (line ${lineNumber})` : "";
  return new Error(`Invalid YAML frontmatter: ${message}${location}`);
}
function isIgnorableLine(line) {
  const trimmed = line.trim();
  return trimmed === "" || line.trimStart().startsWith("#");
}
function nextSignificantLine(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (!isIgnorableLine(lines[i])) {
      return i;
    }
  }
  return -1;
}
function countIndent(line) {
  let indent = 0;
  while (indent < line.length) {
    const char = line[indent];
    if (char === " ") {
      indent += 1;
      continue;
    }
    if (char === "	") {
      throw invalidYaml("tab indentation is not allowed");
    }
    break;
  }
  return indent;
}
function parseYamlScalar(raw) {
  const value = raw.trim();
  if (value === "") {
    return "";
  }
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "'" || first === '"') && last === first && value.length >= 2) {
    return value.slice(1, -1);
  }
  if (first === "'" || first === '"') {
    throw invalidYaml("unterminated quoted scalar");
  }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}
function parseInlineArray(raw) {
  const value = raw.trim();
  if (!(value.startsWith("[") && value.endsWith("]"))) {
    throw invalidYaml("inline array must start with '[' and end with ']'");
  }
  const inner = value.slice(1, -1);
  if (inner.trim() === "") {
    return [];
  }
  const items = [];
  let token = "";
  let quote = null;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      token += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      token += char;
      continue;
    }
    if (char === ",") {
      const part = token.trim();
      if (part === "") {
        throw invalidYaml("inline array contains an empty entry");
      }
      items.push(part);
      token = "";
      continue;
    }
    token += char;
  }
  if (quote) {
    throw invalidYaml("unterminated quoted scalar in inline array");
  }
  const lastToken = token.trim();
  if (lastToken === "") {
    throw invalidYaml("inline array contains an empty entry");
  }
  items.push(lastToken);
  return items.map((item) => {
    if (item.trim().startsWith("[") && item.trim().endsWith("]")) {
      return parseInlineArray(item);
    }
    return parseYamlScalar(item);
  });
}
function parseInlineValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return parseInlineArray(value);
  }
  return parseYamlScalar(value);
}
function parseBlockScalarIndicator(raw) {
  const value = raw.trim();
  const match = value.match(/^([|>])([+-])?$/);
  if (!match) {
    return null;
  }
  const style = match[1];
  const chompChar = match[2];
  const chomp =
    chompChar === "-" ? "strip" : chompChar === "+" ? "keep" : "clip";
  return { chomp, style };
}
function parseBlockScalar(lines, startIndex, parentIndent, style, chomp) {
  let index = startIndex;
  const contentLines = [];
  let contentIndent = null;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      if (contentIndent !== null) {
        contentLines.push("");
      }
      index += 1;
      continue;
    }
    const lineIndent = countIndent(line);
    if (lineIndent <= parentIndent) {
      break;
    }
    if (contentIndent === null) {
      contentIndent = lineIndent;
    }
    if (lineIndent < contentIndent) {
      throw invalidYaml(
        `unexpected indentation in block scalar, expected at least ${contentIndent} spaces but found ${lineIndent}`,
        index + 1
      );
    }
    contentLines.push(line.slice(contentIndent));
    index += 1;
  }
  while (contentLines.length > 0 && contentLines[0] === "") {
    contentLines.shift();
  }
  let text;
  if (style === "|") {
    text = contentLines.join("\n");
  } else {
    const paragraphs = [];
    let current = [];
    for (const line of contentLines) {
      if (line === "") {
        if (current.length > 0) {
          paragraphs.push(current.join(" "));
          current = [];
        } else if (paragraphs.length > 0) {
          paragraphs.push("");
        }
        continue;
      }
      current.push(line.trimEnd());
    }
    if (current.length > 0) {
      paragraphs.push(current.join(" "));
    }
    text = paragraphs.join("\n");
  }
  if (chomp === "strip") {
    text = text.replace(/\n+$/, "");
  } else if (chomp === "keep") {
    if (style === "|" && contentLines.length > 0 && !text.endsWith("\n")) {
    }
  } else {
    text = text.replace(/\n+$/, "");
    if (style === "|") {
      text =
        text.length > 0
          ? `${text}
`
          : "";
    }
  }
  return { nextIndex: index, value: text };
}
function parseYamlBlock(lines, startIndex, indent) {
  let index = nextSignificantLine(lines, startIndex);
  if (index === -1) {
    return { nextIndex: lines.length, value: "" };
  }
  const firstIndent = countIndent(lines[index]);
  if (firstIndent < indent) {
    return { nextIndex: index, value: "" };
  }
  if (firstIndent !== indent) {
    throw invalidYaml(
      `unexpected indentation, expected ${indent} spaces but found ${firstIndent}`,
      index + 1
    );
  }
  const firstContent = lines[index].slice(indent);
  if (firstContent.startsWith("-")) {
    const arr = [];
    while (index < lines.length) {
      if (isIgnorableLine(lines[index])) {
        index += 1;
        continue;
      }
      const lineIndent = countIndent(lines[index]);
      if (lineIndent < indent) {
        break;
      }
      if (lineIndent !== indent) {
        throw invalidYaml(
          `unexpected indentation inside array, expected ${indent} spaces but found ${lineIndent}`,
          index + 1
        );
      }
      const content = lines[index].slice(indent);
      if (!content.startsWith("-")) {
        throw invalidYaml("array items must start with '-'", index + 1);
      }
      const remainder = content.slice(1).trim();
      if (remainder !== "") {
        arr.push(parseInlineValue(remainder));
        index += 1;
        continue;
      }
      const childStart = nextSignificantLine(lines, index + 1);
      if (childStart === -1) {
        arr.push("");
        index += 1;
        continue;
      }
      const childIndent = countIndent(lines[childStart]);
      if (childIndent <= indent) {
        arr.push("");
        index += 1;
        continue;
      }
      const child = parseYamlBlock(lines, childStart, childIndent);
      arr.push(child.value);
      index = child.nextIndex;
    }
    return { nextIndex: index, value: arr };
  }
  const obj = {};
  while (index < lines.length) {
    if (isIgnorableLine(lines[index])) {
      index += 1;
      continue;
    }
    const lineIndent = countIndent(lines[index]);
    if (lineIndent < indent) {
      break;
    }
    if (lineIndent !== indent) {
      throw invalidYaml(
        `unexpected indentation inside object, expected ${indent} spaces but found ${lineIndent}`,
        index + 1
      );
    }
    const content = lines[index].slice(indent);
    if (content.startsWith("-")) {
      throw invalidYaml(
        "found list item where key-value pair was expected",
        index + 1
      );
    }
    const colonIndex = content.indexOf(":");
    if (colonIndex === -1) {
      throw invalidYaml("missing ':' in key-value pair", index + 1);
    }
    const key = content.slice(0, colonIndex).trim();
    if (key === "") {
      throw invalidYaml("empty key is not allowed", index + 1);
    }
    if (key in obj) {
      throw invalidYaml(
        `duplicate key "${key}" (first defined earlier in this block)`,
        index + 1
      );
    }
    const remainder = content.slice(colonIndex + 1);
    const remainderTrimmed = remainder.trim();
    if (remainderTrimmed !== "") {
      const blockIndicator = parseBlockScalarIndicator(remainderTrimmed);
      if (blockIndicator) {
        const scalar = parseBlockScalar(
          lines,
          index + 1,
          indent,
          blockIndicator.style,
          blockIndicator.chomp
        );
        obj[key] = scalar.value;
        index = scalar.nextIndex;
        continue;
      }
      obj[key] = parseInlineValue(remainder);
      index += 1;
      continue;
    }
    const childStart = nextSignificantLine(lines, index + 1);
    if (childStart === -1) {
      obj[key] = "";
      index += 1;
      continue;
    }
    const childIndent = countIndent(lines[childStart]);
    if (childIndent <= indent) {
      obj[key] = "";
      index += 1;
      continue;
    }
    const child = parseYamlBlock(lines, childStart, childIndent);
    obj[key] = child.value;
    index = child.nextIndex;
  }
  return { nextIndex: index, value: obj };
}
function parseSimpleYaml(yamlStr) {
  const normalized = yamlStr.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const start = nextSignificantLine(lines, 0);
  if (start === -1) {
    return {};
  }
  const firstIndent = countIndent(lines[start]);
  if (firstIndent !== 0) {
    throw invalidYaml(
      `top-level entries must start at column 1 (found ${firstIndent} leading spaces)`,
      start + 1
    );
  }
  const parsed = parseYamlBlock(lines, start, 0);
  const trailing = nextSignificantLine(lines, parsed.nextIndex);
  if (trailing !== -1) {
    throw invalidYaml("unexpected trailing content", trailing + 1);
  }
  if (
    parsed.value == null ||
    typeof parsed.value !== "object" ||
    Array.isArray(parsed.value)
  ) {
    throw invalidYaml("root document must be a key-value object");
  }
  return parsed.value;
}
function parseValidateRules(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rules = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const obj = item;
    if (typeof obj.pattern !== "string" || obj.pattern === "") {
      continue;
    }
    if (typeof obj.message !== "string" || obj.message === "") {
      continue;
    }
    const severity = obj.severity;
    if (
      severity !== "error" &&
      severity !== "recommended" &&
      severity !== "warn"
    ) {
      continue;
    }
    const rule = {
      message: obj.message,
      pattern: obj.pattern,
      severity,
    };
    if (
      typeof obj.skipIfFileContains === "string" &&
      obj.skipIfFileContains !== ""
    ) {
      rule.skipIfFileContains = obj.skipIfFileContains;
    }
    if (typeof obj.upgradeToSkill === "string" && obj.upgradeToSkill !== "") {
      rule.upgradeToSkill = obj.upgradeToSkill;
    }
    if (typeof obj.upgradeWhy === "string" && obj.upgradeWhy !== "") {
      rule.upgradeWhy = obj.upgradeWhy;
    }
    if (obj.upgradeMode === "hard" || obj.upgradeMode === "soft") {
      rule.upgradeMode = obj.upgradeMode;
    } else if (rule.upgradeToSkill) {
      rule.upgradeMode = "soft";
    }
    rules.push(rule);
  }
  return rules;
}
function parseChainToRules(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rules = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const obj = item;
    if (typeof obj.pattern !== "string" || obj.pattern === "") {
      continue;
    }
    if (typeof obj.targetSkill !== "string" || obj.targetSkill === "") {
      continue;
    }
    const rule = {
      pattern: obj.pattern,
      targetSkill: obj.targetSkill,
    };
    if (typeof obj.message === "string" && obj.message !== "") {
      rule.message = obj.message;
    }
    if (
      typeof obj.skipIfFileContains === "string" &&
      obj.skipIfFileContains !== ""
    ) {
      rule.skipIfFileContains = obj.skipIfFileContains;
    }
    rules.push(rule);
  }
  return rules;
}
function parseSkillFrontmatter(yamlStr) {
  if (!(yamlStr && yamlStr.trim())) {
    return {
      chainTo: [],
      description: "",
      metadata: {},
      name: "",
      summary: "",
      validate: [],
    };
  }
  const doc = parseSimpleYaml(yamlStr);
  return {
    chainTo: parseChainToRules(doc.chainTo),
    description: typeof doc.description === "string" ? doc.description : "",
    metadata:
      doc.metadata != null &&
      typeof doc.metadata === "object" &&
      !Array.isArray(doc.metadata)
        ? doc.metadata
        : {},
    name: typeof doc.name === "string" ? doc.name : "",
    summary: typeof doc.summary === "string" ? doc.summary : "",
    validate: parseValidateRules(doc.validate),
    ...(doc.retrieval != null &&
    typeof doc.retrieval === "object" &&
    !Array.isArray(doc.retrieval)
      ? { retrieval: parseRetrievalBlock(doc.retrieval) }
      : {}),
  };
}
function parseRetrievalBlock(raw) {
  const toStringArray = (v) => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v.filter((s) => typeof s === "string" && s !== "");
  };
  return {
    aliases: toStringArray(raw.aliases),
    entities: toStringArray(raw.entities),
    examples: toStringArray(raw.examples),
    intents: toStringArray(raw.intents),
  };
}
function scanSkillsDir(rootDir) {
  const skills = [];
  const diagnostics = [];
  let entries;
  try {
    entries = readdirSync(rootDir).sort();
  } catch {
    return { diagnostics, skills };
  }
  for (const entry of entries) {
    const skillDir = join(rootDir, entry);
    try {
      if (!statSync(skillDir).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    const skillFile = join(skillDir, "SKILL.md");
    const content = safeReadFile(skillFile);
    if (content === null) {
      continue;
    }
    let parsed;
    try {
      const { yaml: yamlStr } = extractFrontmatter(content);
      parsed = parseSkillFrontmatter(yamlStr);
    } catch (err) {
      const error = err;
      diagnostics.push({
        error: error.constructor?.name ?? "Error",
        file: skillFile,
        message: error.message,
      });
      continue;
    }
    skills.push({
      chainTo: parsed.chainTo,
      description: parsed.description,
      dir: entry,
      metadata: parsed.metadata,
      name: parsed.name || entry,
      summary: parsed.summary,
      validate: parsed.validate,
      ...(parsed.retrieval ? { retrieval: parsed.retrieval } : {}),
    });
  }
  return { diagnostics, skills };
}
function parsePromptSignals(raw, opts) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return void 0;
  }
  const obj = raw;
  const skill = opts?.skill ?? "";
  const warn = opts?.addWarning;
  const toStringArray = (v) => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v.filter((x) => typeof x === "string" && x !== "");
  };
  const countEmptyStrings = (v) => {
    if (!Array.isArray(v)) {
      return 0;
    }
    return v.filter((x) => typeof x === "string" && x === "").length;
  };
  const toStringArrayArray = (v) => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v
      .filter((g) => Array.isArray(g))
      .map((g) => g.filter((x) => typeof x === "string" && x !== ""))
      .filter((g) => g.length > 0);
  };
  const countNonArrayAllOf = (v) => {
    if (!Array.isArray(v)) {
      return 0;
    }
    return v.filter((g) => !Array.isArray(g)).length;
  };
  const phrases = toStringArray(obj.phrases);
  const allOf = toStringArrayArray(obj.allOf);
  const anyOf = toStringArray(obj.anyOf);
  const noneOf = toStringArray(obj.noneOf);
  const minScore =
    typeof obj.minScore === "number" && !Number.isNaN(obj.minScore)
      ? obj.minScore
      : 6;
  if (warn) {
    if (Array.isArray(obj.phrases) && phrases.length === 0) {
      warn(`skill "${skill}": promptSignals.phrases is empty after filtering`, {
        code: "PROMPT_SIGNALS_EMPTY_PHRASES",
        field: "promptSignals.phrases",
        hint: "Add at least one non-empty phrase string",
        skill,
        valueType: "array",
      });
    }
    const emptyCount = countEmptyStrings(obj.phrases);
    if (emptyCount > 0) {
      warn(
        `skill "${skill}": promptSignals.phrases contains ${emptyCount} empty string(s)`,
        {
          code: "PROMPT_SIGNALS_EMPTY_PHRASES",
          field: "promptSignals.phrases",
          hint: "Remove empty strings from phrases",
          skill,
          valueType: "array",
        }
      );
    }
    const nonArrayCount = countNonArrayAllOf(obj.allOf);
    if (nonArrayCount > 0) {
      warn(
        `skill "${skill}": promptSignals.allOf contains ${nonArrayCount} non-array element(s)`,
        {
          code: "PROMPT_SIGNALS_INVALID_ALLOF_GROUP",
          field: "promptSignals.allOf",
          hint: "Each allOf entry must be an array of strings (e.g. [term1, term2])",
          skill,
          valueType: "array",
        }
      );
    }
    if (
      typeof obj.minScore === "number" &&
      !Number.isNaN(obj.minScore) &&
      obj.minScore < 1
    ) {
      warn(
        `skill "${skill}": promptSignals.minScore is ${obj.minScore}, below minimum of 1`,
        {
          code: "PROMPT_SIGNALS_LOW_MINSCORE",
          field: "promptSignals.minScore",
          hint: "Set minScore to at least 1",
          skill,
          valueType: "number",
        }
      );
    }
  }
  if (
    phrases.length === 0 &&
    allOf.length === 0 &&
    anyOf.length === 0 &&
    noneOf.length === 0
  ) {
    return void 0;
  }
  return { allOf, anyOf, minScore, noneOf, phrases };
}
function normalizePatternField(opts) {
  const { raw, skill, field, fieldTypeHint, coerceStrings, addWarning } = opts;
  let arr;
  if (coerceStrings && typeof raw === "string") {
    addWarning(`skill "${skill}": ${field} is a string, coercing to array`, {
      code: "COERCE_STRING_TO_ARRAY",
      field,
      hint: `Change ${field} to a YAML list`,
      skill,
      valueType: "string",
    });
    arr = [raw];
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    addWarning(
      `skill "${skill}": ${field} is not an array (${typeof raw}), defaulting to []`,
      {
        code: "INVALID_TYPE",
        field,
        hint: `${field} must be an array of ${fieldTypeHint}`,
        skill,
        valueType: typeof raw,
      }
    );
    arr = [];
  }
  return arr.filter((p, i) => {
    if (typeof p !== "string") {
      addWarning(
        `skill "${skill}": ${field}[${i}] is not a string (${typeof p}), removing`,
        {
          code: "ENTRY_NOT_STRING",
          field: `${field}[${i}]`,
          hint: `Each ${field} entry must be a string`,
          skill,
          valueType: typeof p,
        }
      );
      return false;
    }
    if (p === "") {
      addWarning(`skill "${skill}": ${field}[${i}] is empty, removing`, {
        code: "ENTRY_EMPTY",
        field: `${field}[${i}]`,
        hint: `Remove empty entries from ${field}`,
        skill,
        valueType: "string",
      });
      return false;
    }
    return true;
  });
}
function buildSkillMap(rootDir) {
  const skills = {};
  const warnings = [];
  const warningDetails = [];
  const { skills: parsed, diagnostics } = scanSkillsDir(rootDir);
  function addWarning(msg, detail) {
    warnings.push(msg);
    warningDetails.push({ ...detail, message: msg });
  }
  for (const skill of parsed) {
    const meta = skill.metadata || {};
    let rawPathPatterns;
    if (meta.pathPatterns !== void 0) {
      rawPathPatterns = meta.pathPatterns;
    } else if (meta.filePattern === void 0) {
      rawPathPatterns = [];
    } else {
      rawPathPatterns = meta.filePattern;
      addWarning(
        `skill "${skill.dir}": metadata.filePattern is deprecated, rename to pathPatterns`,
        {
          code: "DEPRECATED_FIELD",
          field: "filePattern",
          hint: "Rename metadata.filePattern to metadata.pathPatterns",
          skill: skill.dir,
          valueType: typeof meta.filePattern,
        }
      );
    }
    const filteredPathPatterns = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "pathPatterns",
      fieldTypeHint: "glob strings",
      raw: rawPathPatterns,
      skill: skill.dir,
    });
    let rawBashPatterns;
    if (meta.bashPatterns !== void 0) {
      rawBashPatterns = meta.bashPatterns;
    } else if (meta.bashPattern === void 0) {
      rawBashPatterns = [];
    } else {
      rawBashPatterns = meta.bashPattern;
      addWarning(
        `skill "${skill.dir}": metadata.bashPattern is deprecated, rename to bashPatterns`,
        {
          code: "DEPRECATED_FIELD",
          field: "bashPattern",
          hint: "Rename metadata.bashPattern to metadata.bashPatterns",
          skill: skill.dir,
          valueType: typeof meta.bashPattern,
        }
      );
    }
    const filteredBashPatterns = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "bashPatterns",
      fieldTypeHint: "regex strings",
      raw: rawBashPatterns,
      skill: skill.dir,
    });
    const rawImportPatterns =
      meta.importPatterns === void 0 ? [] : meta.importPatterns;
    const filteredImportPatterns = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "importPatterns",
      fieldTypeHint: "package name strings",
      raw: rawImportPatterns,
      skill: skill.dir,
    });
    const promptSignals = parsePromptSignals(meta.promptSignals, {
      addWarning,
      skill: skill.dir,
    });
    const rawDocs = meta.docs === void 0 ? [] : meta.docs;
    const filteredDocs = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "docs",
      fieldTypeHint: "URL strings",
      raw: rawDocs,
      skill: skill.dir,
    });
    const rawSitemap = meta.sitemap;
    const sitemap =
      typeof rawSitemap === "string" && rawSitemap.length > 0
        ? rawSitemap
        : void 0;
    const entry = {
      bashPatterns: filteredBashPatterns,
      docs: filteredDocs,
      importPatterns: filteredImportPatterns,
      pathPatterns: filteredPathPatterns,
      priority: meta.priority ?? 5,
      summary: skill.summary || "",
      validate: skill.validate,
    };
    if (sitemap) {
      entry.sitemap = sitemap;
    }
    if (skill.chainTo.length > 0) {
      entry.chainTo = skill.chainTo;
    }
    if (promptSignals) {
      entry.promptSignals = promptSignals;
    }
    if (skill.retrieval) {
      entry.retrieval = skill.retrieval;
    }
    skills[skill.dir] = entry;
  }
  return {
    diagnostics,
    skills,
    warningDetails,
    warnings,
  };
}
var KNOWN_KEYS = /* @__PURE__ */ new Set([
  "priority",
  "summary",
  "docs",
  "sitemap",
  "pathPatterns",
  "bashPatterns",
  "importPatterns",
  "validate",
  "chainTo",
  "promptSignals",
  "retrieval",
]);
function validateSkillMap(raw) {
  const errors = [];
  const errorDetails = [];
  const warnings = [];
  const warningDetails = [];
  function addError(msg, detail) {
    errors.push(msg);
    errorDetails.push({ ...detail, message: msg });
  }
  function addWarning(msg, detail) {
    warnings.push(msg);
    warningDetails.push({ ...detail, message: msg });
  }
  if (raw == null || typeof raw !== "object") {
    return {
      errorDetails: [
        {
          code: "INVALID_ROOT",
          field: "",
          hint: "Pass a valid skill-map object",
          message: "skill-map must be a non-null object",
          skill: "",
          valueType: typeof raw,
        },
      ],
      errors: ["skill-map must be a non-null object"],
      ok: false,
    };
  }
  if (!("skills" in raw)) {
    return {
      errorDetails: [
        {
          code: "MISSING_SKILLS_KEY",
          field: "skills",
          hint: "Add a 'skills' key to the skill-map object",
          message: "skill-map is missing required 'skills' key",
          skill: "",
          valueType: "undefined",
        },
      ],
      errors: ["skill-map is missing required 'skills' key"],
      ok: false,
    };
  }
  const rawObj = raw;
  const skills = rawObj.skills;
  if (skills == null || typeof skills !== "object" || Array.isArray(skills)) {
    return {
      errorDetails: [
        {
          code: "SKILLS_NOT_OBJECT",
          field: "skills",
          hint: "'skills' should be a plain object keyed by skill directory name",
          message: "'skills' must be a non-null object (not an array)",
          skill: "",
          valueType: Array.isArray(skills) ? "array" : typeof skills,
        },
      ],
      errors: ["'skills' must be a non-null object (not an array)"],
      ok: false,
    };
  }
  const normalizedSkills = {};
  for (const [skill, config] of Object.entries(skills)) {
    if (config == null || typeof config !== "object" || Array.isArray(config)) {
      addError(`skill "${skill}": config must be a non-null object`, {
        code: "CONFIG_NOT_OBJECT",
        field: "",
        hint: "Each skill config must be a plain object",
        skill,
        valueType: Array.isArray(config) ? "array" : typeof config,
      });
      continue;
    }
    const cfg = config;
    for (const key of Object.keys(cfg)) {
      if (!KNOWN_KEYS.has(key)) {
        addWarning(`skill "${skill}": unknown key "${key}"`, {
          code: "UNKNOWN_KEY",
          field: key,
          hint: `Remove or rename unknown key "${key}"`,
          skill,
          valueType: typeof cfg[key],
        });
      }
    }
    let priority = 5;
    if ("priority" in cfg) {
      const p = cfg.priority;
      if (typeof p !== "number" || Number.isNaN(p)) {
        addWarning(
          `skill "${skill}": priority is not a valid number, defaulting to 5`,
          {
            code: "INVALID_PRIORITY",
            field: "priority",
            hint: "Set priority to a numeric value (e.g., 5)",
            skill,
            valueType: typeof p,
          }
        );
      } else {
        priority = p;
      }
    }
    const pathPatterns = normalizePatternField({
      addWarning,
      coerceStrings: false,
      field: "pathPatterns",
      fieldTypeHint: "glob strings",
      raw: "pathPatterns" in cfg ? cfg.pathPatterns : [],
      skill,
    });
    const bashPatterns = normalizePatternField({
      addWarning,
      coerceStrings: false,
      field: "bashPatterns",
      fieldTypeHint: "regex strings",
      raw: "bashPatterns" in cfg ? cfg.bashPatterns : [],
      skill,
    });
    const importPatterns = normalizePatternField({
      addWarning,
      coerceStrings: false,
      field: "importPatterns",
      fieldTypeHint: "package name strings",
      raw: "importPatterns" in cfg ? cfg.importPatterns : [],
      skill,
    });
    const summary = typeof cfg.summary === "string" ? cfg.summary : "";
    const docs = normalizePatternField({
      addWarning,
      coerceStrings: false,
      field: "docs",
      fieldTypeHint: "URL strings",
      raw: "docs" in cfg ? cfg.docs : [],
      skill,
    });
    const validate = parseValidateRules(cfg.validate);
    const promptSignals = parsePromptSignals(cfg.promptSignals, {
      addWarning,
      skill,
    });
    const sitemap =
      typeof cfg.sitemap === "string" && cfg.sitemap.length > 0
        ? cfg.sitemap
        : void 0;
    const chainTo = parseChainToRules(cfg.chainTo);
    const normalizedEntry = {
      bashPatterns,
      docs,
      importPatterns,
      pathPatterns,
      priority,
      summary,
      validate,
    };
    if (sitemap) {
      normalizedEntry.sitemap = sitemap;
    }
    if (chainTo.length > 0) {
      normalizedEntry.chainTo = chainTo;
    }
    if (promptSignals) {
      normalizedEntry.promptSignals = promptSignals;
    }
    if (
      cfg.retrieval != null &&
      typeof cfg.retrieval === "object" &&
      !Array.isArray(cfg.retrieval)
    ) {
      normalizedEntry.retrieval = cfg.retrieval;
    }
    normalizedSkills[skill] = normalizedEntry;
  }
  const allSlugs = new Set(Object.keys(normalizedSkills));
  for (const [skill, config] of Object.entries(normalizedSkills)) {
    if (!config.chainTo) {
      continue;
    }
    for (const rule of config.chainTo) {
      if (!allSlugs.has(rule.targetSkill)) {
        addError(
          `skill "${skill}": chainTo references non-existent skill "${rule.targetSkill}"`,
          {
            code: "CHAIN_TO_MISSING_TARGET",
            field: "chainTo.targetSkill",
            hint: `Ensure "${rule.targetSkill}" exists as a skill directory`,
            skill,
            valueType: "string",
          }
        );
      }
    }
  }
  for (const [skill, config] of Object.entries(normalizedSkills)) {
    if (!config.validate?.length) {
      continue;
    }
    const chainTargets = new Set(
      (config.chainTo ?? []).map((c) => c.targetSkill)
    );
    for (const rule of config.validate) {
      if (
        rule.upgradeToSkill &&
        (rule.severity === "error" || rule.severity === "recommended") &&
        !chainTargets.has(rule.upgradeToSkill)
      ) {
        addWarning(
          `skill "${skill}": validate rule with upgradeToSkill "${rule.upgradeToSkill}" (severity: ${rule.severity}) has no matching chainTo entry`,
          {
            code: "UPGRADE_WITHOUT_CHAIN",
            field: "validate.upgradeToSkill",
            hint: `Add a chainTo entry targeting "${rule.upgradeToSkill}" or let build-manifest synthesize one`,
            skill,
            valueType: "string",
          }
        );
      }
    }
  }
  if (errors.length > 0) {
    return { errorDetails, errors, ok: false };
  }
  return {
    normalizedSkillMap: { skills: normalizedSkills },
    ok: true,
    warningDetails,
    warnings,
  };
}

export {
  buildSkillMap,
  extractFrontmatter,
  parseSkillFrontmatter,
  scanSkillsDir,
  validateSkillMap,
};
