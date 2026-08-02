/**
 * `xylex-group-plugin doctor` — self-diagnosis command that checks:
 *   1. Manifest vs dynamic-scan parity
 *   2. Hook timeout risk (skill count threshold)
 *   3. Dedup env var correctness
 *   4. Skill map validation errors/warnings
 *
 * Exit code 0 = all checks pass, non-zero = issues found.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadValidatedSkillMap } from "../shared/skill-map-loader.ts";

/** Threshold at which pattern count may threaten the 5-second hook timeout. */
const PATTERN_COUNT_WARN_THRESHOLD = 200;

/** Threshold at which skill count alone is a concern. */
const SKILL_COUNT_WARN_THRESHOLD = 50;

export interface DoctorIssue {
  check: string;
  hint?: string;
  message: string;
  severity: "error" | "warning";
}

export interface DoctorResult {
  issues: DoctorIssue[];
  summary: {
    manifestSkillCount: number | null;
    liveSkillCount: number;
    totalPatterns: number;
    dedupStrategy: string;
  };
}

export function doctor(projectRoot: string): DoctorResult {
  const issues: DoctorIssue[] = [];
  const skillsDir = join(projectRoot, "skills");
  const manifestPath = join(projectRoot, "generated", "skill-manifest.json");
  const hooksJsonPath = join(projectRoot, "hooks", "hooks.json");

  let hooksConfig: { hooks?: Record<string, any[]> } = {};
  if (existsSync(hooksJsonPath)) {
    try {
      hooksConfig = JSON.parse(readFileSync(hooksJsonPath, "utf-8"));
    } catch (err: any) {
      issues.push({
        check: "hooks",
        message: `Failed to parse hooks.json: ${err.message}`,
        severity: "error",
      });
    }
  }

  const registeredHooks = hooksConfig.hooks ?? {};
  const hasAutomaticSkillInjectionHooks =
    (registeredHooks.PreToolUse ?? []).some(
      (entry: any) =>
        Array.isArray(entry?.hooks) &&
        entry.hooks.some(
          (hook: any) =>
            typeof hook?.command === "string" &&
            hook.command.includes("pretooluse-skill-inject.mjs")
        )
    ) ||
    (registeredHooks.UserPromptSubmit ?? []).some(
      (entry: any) =>
        Array.isArray(entry?.hooks) &&
        entry.hooks.some(
          (hook: any) =>
            typeof hook?.command === "string" &&
            hook.command.includes("user-prompt-submit-skill-inject.mjs")
        )
    );

  // --- Live scan ---
  const {
    validation,
    skills: loadedSkills,
    buildDiagnostics,
  } = loadValidatedSkillMap(skillsDir);

  if (!validation.ok) {
    for (const e of validation.errors) {
      issues.push({
        check: "skill-validation",
        message: e,
        severity: "error",
      });
    }
  }

  if (validation.warnings?.length) {
    for (const w of validation.warnings) {
      issues.push({
        check: "skill-validation",
        message: w,
        severity: "warning",
      });
    }
  }

  if (buildDiagnostics.length > 0) {
    for (const d of buildDiagnostics) {
      issues.push({
        check: "skill-build",
        message: d,
        severity: "warning",
      });
    }
  }

  const liveSkills: Record<
    string,
    { priority: number; pathPatterns: string[]; bashPatterns: string[] }
  > = loadedSkills;

  const liveSkillCount = Object.keys(liveSkills).length;

  // --- Manifest parity ---
  let manifestSkillCount: number | null = null;

  if (existsSync(manifestPath)) {
    let manifest: { skills: Record<string, any> };
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (err: any) {
      issues.push({
        check: "manifest-parse",
        message: `Failed to parse manifest: ${err.message}`,
        severity: "error",
      });
      manifest = { skills: {} };
    }

    const manifestSkills = manifest.skills ?? {};
    manifestSkillCount = Object.keys(manifestSkills).length;

    // Check for skills present in live but missing from manifest (and vice versa)
    const liveNames = new Set(Object.keys(liveSkills));
    const manifestNames = new Set(Object.keys(manifestSkills));

    const missingFromManifest = [...liveNames].filter(
      (s) => !manifestNames.has(s)
    );
    const extraInManifest = [...manifestNames].filter((s) => !liveNames.has(s));

    if (missingFromManifest.length > 0) {
      issues.push({
        check: "manifest-parity",
        hint: "Run `bun run build:manifest` to regenerate",
        message: `Skills in live scan but missing from manifest: ${missingFromManifest.join(", ")}`,
        severity: "error",
      });
    }

    if (extraInManifest.length > 0) {
      issues.push({
        check: "manifest-parity",
        hint: "A skill directory may have been deleted without rebuilding the manifest",
        message: `Skills in manifest but missing from live scan: ${extraInManifest.join(", ")}`,
        severity: "error",
      });
    }

    // Check for content drift (priority or pattern differences)
    if (missingFromManifest.length === 0 && extraInManifest.length === 0) {
      for (const name of liveNames) {
        const live = liveSkills[name];
        const mf = manifestSkills[name];

        if (live.priority !== mf.priority) {
          issues.push({
            check: "manifest-parity",
            hint: "Run `bun run build:manifest` to regenerate",
            message: `Skill "${name}" priority differs: live=${live.priority}, manifest=${mf.priority}`,
            severity: "error",
          });
        }

        const livePaths = (live.pathPatterns ?? []).sort().join(",");
        const mfPaths = (mf.pathPatterns ?? []).sort().join(",");
        if (livePaths !== mfPaths) {
          issues.push({
            check: "manifest-parity",
            hint: "Run `bun run build:manifest` to regenerate",
            message: `Skill "${name}" pathPatterns differ between live scan and manifest`,
            severity: "error",
          });
        }

        const liveBash = (live.bashPatterns ?? []).sort().join(",");
        const mfBash = (mf.bashPatterns ?? []).sort().join(",");
        if (liveBash !== mfBash) {
          issues.push({
            check: "manifest-parity",
            hint: "Run `bun run build:manifest` to regenerate",
            message: `Skill "${name}" bashPatterns differ between live scan and manifest`,
            severity: "error",
          });
        }
      }
    }
  } else {
    issues.push({
      check: "manifest-exists",
      hint: "Run `bun run build:manifest` to generate it",
      message: "No generated/skill-manifest.json found",
      severity: "warning",
    });
  }

  // --- Hook timeout risk ---
  let totalPatterns = 0;
  for (const skill of Object.values(liveSkills)) {
    totalPatterns +=
      (skill.pathPatterns?.length ?? 0) + (skill.bashPatterns?.length ?? 0);
  }

  if (
    hasAutomaticSkillInjectionHooks &&
    liveSkillCount > SKILL_COUNT_WARN_THRESHOLD
  ) {
    issues.push({
      check: "hook-timeout",
      hint: "Consider consolidating low-priority skills or raising pattern specificity",
      message: `${liveSkillCount} skills registered — may approach the 5-second hook timeout budget`,
      severity: "warning",
    });
  }

  if (
    hasAutomaticSkillInjectionHooks &&
    totalPatterns > PATTERN_COUNT_WARN_THRESHOLD
  ) {
    issues.push({
      check: "hook-timeout",
      hint: "Use the manifest (build:manifest) to avoid live-scan overhead at runtime",
      message: `${totalPatterns} total patterns — regex compilation overhead may threaten hook timeout`,
      severity: "warning",
    });
  }

  // --- Dedup env var ---
  const dedupOff = process.env.XYLEX_PLUGIN_HOOK_DEDUP === "off";
  const seenSkillsEnv = process.env.XYLEX_PLUGIN_SEEN_SKILLS;
  let dedupStrategy: string;

  if (dedupOff) {
    dedupStrategy = "disabled";
    issues.push({
      check: "dedup",
      hint: "Skills may be injected multiple times per session",
      message: "Deduplication is disabled (XYLEX_PLUGIN_HOOK_DEDUP=off)",
      severity: "warning",
    });
  } else if (seenSkillsEnv === undefined) {
    dedupStrategy = "memory-only";
    issues.push({
      check: "dedup",
      hint: "Ensure session-start-seen-skills.mjs runs on SessionStart to set the env var",
      message:
        "XYLEX_PLUGIN_SEEN_SKILLS is not set — dedup limited to single invocation",
      severity: "warning",
    });
  } else {
    dedupStrategy = "env-var";
    // Validate format: should be empty or comma-delimited slugs
    if (seenSkillsEnv !== "" && !/^[\w-]+(,[\w-]+)*$/.test(seenSkillsEnv)) {
      issues.push({
        check: "dedup",
        hint: "Expected empty string or comma-delimited skill slugs (e.g., 'nextjs,ai-sdk')",
        message: `XYLEX_PLUGIN_SEEN_SKILLS has unexpected format: "${seenSkillsEnv}"`,
        severity: "error",
      });
    }
  }

  // --- Stale generated files (template newer than output) ---
  const tmplDirs = [join(projectRoot, "agents"), join(projectRoot, "commands")];
  for (const dir of tmplDirs) {
    if (!existsSync(dir)) {
      continue;
    }
    let files: string[];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".md.tmpl")) {
        continue;
      }
      const tmplPath = join(dir, f);
      const outPath = join(dir, f.replace(/\.md\.tmpl$/, ".md"));

      if (!existsSync(outPath)) {
        issues.push({
          check: "template-staleness",
          hint: "Run `bun run build:from-skills` to generate it",
          message: `Template ${f} has no generated output: ${f.replace(/\.tmpl$/, "")}`,
          severity: "error",
        });
        continue;
      }

      const tmplMtime = statSync(tmplPath).mtimeMs;
      const outMtime = statSync(outPath).mtimeMs;
      if (tmplMtime > outMtime) {
        issues.push({
          check: "template-staleness",
          hint: "Run `bun run build:from-skills` to regenerate",
          message: `${f} is newer than its output ${f.replace(/\.tmpl$/, "")}`,
          severity: "error",
        });
      }
    }
  }

  // Check if any SKILL.md is newer than the oldest generated .md
  const skillsRoot = join(projectRoot, "skills");
  if (existsSync(skillsRoot)) {
    let newestSkillMtime = 0;
    try {
      for (const skillDir of readdirSync(skillsRoot)) {
        const skillFile = join(skillsRoot, skillDir, "SKILL.md");
        if (existsSync(skillFile)) {
          const mtime = statSync(skillFile).mtimeMs;
          if (mtime > newestSkillMtime) {
            newestSkillMtime = mtime;
          }
        }
      }
    } catch {
      // skip if skills dir is unreadable
    }

    if (newestSkillMtime > 0) {
      for (const dir of tmplDirs) {
        if (!existsSync(dir)) {
          continue;
        }
        let files: string[];
        try {
          files = readdirSync(dir);
        } catch {
          continue;
        }
        for (const f of files) {
          if (!f.endsWith(".md.tmpl")) {
            continue;
          }
          const outPath = join(dir, f.replace(/\.md\.tmpl$/, ".md"));
          if (!existsSync(outPath)) {
            continue;
          }
          const outMtime = statSync(outPath).mtimeMs;
          if (newestSkillMtime > outMtime) {
            issues.push({
              check: "template-staleness",
              hint: "Run `bun run build:from-skills` to regenerate (skill content may have changed)",
              message: `A SKILL.md was modified after ${f.replace(/\.tmpl$/, "")} was last generated`,
              severity: "warning",
            });
            break; // One warning per dir is enough
          }
        }
      }
    }
  }

  if (!existsSync(hooksJsonPath)) {
    issues.push({
      check: "hooks",
      hint: "Ensure hooks/hooks.json exists",
      message: "hooks/hooks.json not found",
      severity: "error",
    });
  }

  return {
    issues,
    summary: {
      dedupStrategy,
      liveSkillCount,
      manifestSkillCount,
      totalPatterns,
    },
  };
}

export function formatDoctorResult(result: DoctorResult): string {
  const lines: string[] = [];
  const { summary, issues } = result;

  lines.push("xylex-group-plugin doctor");
  lines.push("====================");
  lines.push("");

  lines.push(`Skills (live scan): ${summary.liveSkillCount}`);
  if (summary.manifestSkillCount !== null) {
    lines.push(`Skills (manifest):  ${summary.manifestSkillCount}`);
  }
  lines.push(`Total patterns:     ${summary.totalPatterns}`);
  lines.push(`Dedup strategy:     ${summary.dedupStrategy}`);
  lines.push("");

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) {
    lines.push("All checks passed.");
  } else {
    if (errors.length > 0) {
      lines.push(`Errors (${errors.length}):`);
      for (const e of errors) {
        lines.push(`  [${e.check}] ${e.message}`);
        if (e.hint) {
          lines.push(`    -> ${e.hint}`);
        }
      }
      lines.push("");
    }

    if (warnings.length > 0) {
      lines.push(`Warnings (${warnings.length}):`);
      for (const w of warnings) {
        lines.push(`  [${w.check}] ${w.message}`);
        if (w.hint) {
          lines.push(`    -> ${w.hint}`);
        }
      }
      lines.push("");
    }
  }

  const errorCount = errors.length;
  const warnCount = warnings.length;
  lines.push(`Result: ${errorCount} error(s), ${warnCount} warning(s)`);

  return lines.join("\n");
}
