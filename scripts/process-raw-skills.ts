#!/usr/bin/env bun
/**
 * End-to-end raw-skills → plugins pipeline.
 *
 * Stage skill trees under:
 *   raw-skills/<plugin-id>/<skill-id>/SKILL.md
 *   raw-skills/<plugin-id>/skills/<skill-id>/SKILL.md   (also accepted)
 *
 * Then run:
 *   pnpm run process:raw-skills
 *   bun run process:raw-skills
 *
 * Full e2e (default):
 *   1. Discover raw plugin/skill trees
 *   2. Scaffold plugins/<name>/ if missing
 *   3. Sync skills → plugins/<name>/skills/<skill>/
 *   4. Ensure marketplace entries (Grok + Codex) for new plugins
 *   5. Regenerate .grok-plugin/plugin-index.json
 *   6. Validate catalogs
 *
 * Flags:
 *   --plugin <name>   Only process one plugin id
 *   --sync-only       Skip marketplace / index / validate
 *   --check           Diff only; exit 1 if any skill or scaffold would change
 *   --mirror          Remove plugins/<name>/skills/* not present in raw
 *   --dry-run         Print plan without writing
 *   --help
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dir, "..");
const RAW_DIR = join(ROOT, "raw-skills");
const PLUGINS_DIR = join(ROOT, "plugins");
const GROK_MARKETPLACE = join(ROOT, ".grok-plugin", "marketplace.json");
const CODEX_MARKETPLACE = join(ROOT, ".agents", "plugins", "marketplace.json");

const PLUGIN_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".DS_Store",
  "__pycache__",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CliOptions {
  check: boolean;
  dryRun: boolean;
  help: boolean;
  mirror: boolean;
  pluginFilter: string | null;
  syncOnly: boolean;
}

interface SkillSource {
  /** Absolute path of the skill directory (contains SKILL.md). */
  sourceDir: string;
  skillName: string;
}

interface PluginBatch {
  pluginName: string;
  skills: SkillSource[];
}

interface SkillSyncResult {
  action: "created" | "updated" | "unchanged" | "would-create" | "would-update";
  skill: string;
}

interface PluginResult {
  marketplace: {
    codex: "added" | "exists" | "would-add" | "skipped";
    grok: "added" | "exists" | "would-add" | "skipped";
  };
  plugin: string;
  scaffold: "created" | "exists" | "would-create";
  skills: SkillSyncResult[];
  removedSkills: string[];
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    check: false,
    dryRun: false,
    help: false,
    mirror: false,
    pluginFilter: null,
    syncOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--check") {
      opts.check = true;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--mirror") {
      opts.mirror = true;
    } else if (arg === "--sync-only") {
      opts.syncOnly = true;
    } else if (arg === "--plugin") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("--plugin requires a plugin id");
      }
      opts.pluginFilter = next;
      i++;
    } else if (arg.startsWith("--plugin=")) {
      opts.pluginFilter = arg.slice("--plugin=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`Usage: bun run scripts/process-raw-skills.ts [options]

Process skills from raw-skills/<plugin>/* into plugins/<plugin>/skills/*
and finish the marketplace pipeline (index + validate).

Options:
  --plugin <name>   Only process this plugin id
  --sync-only       Copy/scaffold only (skip marketplace, index, validate)
  --check           Report drift; exit 1 if anything would change
  --mirror          Delete dest skills not present under raw-skills/<plugin>
  --dry-run         Print actions without writing files
  --help            Show this help

Examples:
  pnpm run process:raw-skills
  pnpm run process:raw-skills -- --plugin athena
  pnpm run process:raw-skills -- --check
  pnpm run process:raw-skills -- --sync-only --dry-run
`);
}

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listDirs(path: string): string[] {
  if (!existsSync(path) || !isDir(path)) {
    return [];
  }
  return readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP_DIR_NAMES.has(d.name))
    .map((d) => d.name)
    .sort();
}

function hasSkillMd(dir: string): boolean {
  return existsSync(join(dir, "SKILL.md"));
}

/** Content-equal tree compare for skill dirs (files only, recursive). */
function treesEqual(a: string, b: string): boolean {
  if (!existsSync(a) || !existsSync(b)) {
    return false;
  }
  return treeSignature(a) === treeSignature(b);
}

function treeSignature(root: string): string {
  const parts: string[] = [];

  function walk(dir: string, rel: string) {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((x, y) =>
      x.name.localeCompare(y.name)
    );
    for (const entry of entries) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, nextRel);
      } else if (entry.isFile()) {
        const body = readFileSync(full);
        parts.push(`${nextRel}\0${body.toString("base64")}`);
      }
    }
  }

  walk(root, "");
  return parts.join("\n");
}

function titleCasePlugin(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverSkillsInPluginDir(pluginDir: string): SkillSource[] {
  const skills: SkillSource[] = [];
  const seen = new Set<string>();

  function consider(skillName: string, sourceDir: string) {
    if (!PLUGIN_NAME_RE.test(skillName) && !/^[a-z0-9][a-z0-9._-]*$/.test(skillName)) {
      console.warn(`  skip  invalid skill directory name: ${skillName}`);
      return;
    }
    if (!hasSkillMd(sourceDir)) {
      return;
    }
    if (seen.has(skillName)) {
      console.warn(`  skip  duplicate skill name "${skillName}" under ${pluginDir}`);
      return;
    }
    seen.add(skillName);
    skills.push({ skillName, sourceDir });
  }

  // raw-skills/<plugin>/<skill>/SKILL.md
  for (const name of listDirs(pluginDir)) {
    if (name === "skills") {
      continue;
    }
    consider(name, join(pluginDir, name));
  }

  // raw-skills/<plugin>/skills/<skill>/SKILL.md
  const nestedSkills = join(pluginDir, "skills");
  if (isDir(nestedSkills)) {
    for (const name of listDirs(nestedSkills)) {
      consider(name, join(nestedSkills, name));
    }
  }

  // Single-skill drop: raw-skills/<plugin>/SKILL.md → skill name = plugin name
  if (hasSkillMd(pluginDir) && skills.length === 0) {
    const pluginBase = pluginDir.split(/[/\\]/).pop() ?? "skill";
    consider(pluginBase, pluginDir);
  }

  return skills.sort((a, b) => a.skillName.localeCompare(b.skillName));
}

function discoverBatches(pluginFilter: string | null): PluginBatch[] {
  if (!existsSync(RAW_DIR)) {
    return [];
  }

  const batches: PluginBatch[] = [];
  for (const pluginName of listDirs(RAW_DIR)) {
    if (pluginFilter && pluginName !== pluginFilter) {
      continue;
    }
    if (!PLUGIN_NAME_RE.test(pluginName)) {
      console.warn(
        `skip  raw-skills/${pluginName}: plugin id must match ${PLUGIN_NAME_RE}`
      );
      continue;
    }
    const pluginDir = join(RAW_DIR, pluginName);
    const skills = discoverSkillsInPluginDir(pluginDir);
    if (skills.length === 0) {
      console.warn(
        `skip  raw-skills/${pluginName}: no skill dirs with SKILL.md found`
      );
      continue;
    }
    batches.push({ pluginName, skills });
  }
  return batches;
}

// ---------------------------------------------------------------------------
// Scaffold
// ---------------------------------------------------------------------------

function grokPluginJson(name: string): string {
  const title = titleCasePlugin(name);
  return `${JSON.stringify(
    {
      name,
      version: "1.0.0",
      description: `${title} agent skills packaged for Grok Build and Codex / ChatGPT.`,
      author: {
        name: "XYLEX Group",
        url: "https://github.com/xylex-group",
      },
      repository: `https://github.com/xylex-group/${name}`,
      homepage: `https://github.com/xylex-group/${name}`,
      license: "MIT",
      keywords: [name],
    },
    null,
    2
  )}\n`;
}

function codexPluginJson(name: string): string {
  const title = titleCasePlugin(name);
  return `${JSON.stringify(
    {
      name,
      version: "1.0.0",
      description: `${title} agent skills packaged for Grok Build and Codex / ChatGPT.`,
      author: {
        name: "XYLEX Group",
        url: "https://github.com/xylex-group",
      },
      homepage: `https://github.com/xylex-group/${name}`,
      repository: `https://github.com/xylex-group/${name}`,
      license: "MIT",
      keywords: [name],
      skills: "./skills/",
      interface: {
        displayName: title,
        shortDescription: `${title} agent skills`,
        longDescription: `${title} integration for ChatGPT and Codex: skills staged via raw-skills/${name}.`,
        developerName: "XYLEX Group",
        category: "Developer Tools",
        capabilities: ["Instructions", "Read", "Write"],
        websiteURL: `https://github.com/xylex-group/${name}`,
        defaultPrompt: [
          `Use ${title} skills for this task.`,
          `Which ${title} skill fits this request?`,
        ],
        brandColor: "#111111",
      },
    },
    null,
    2
  )}\n`;
}

function pluginReadme(name: string): string {
  const title = titleCasePlugin(name);
  return `# ${title} plugin

Plugin packaging ${title} agent skills for Grok Build and Codex / ChatGPT.

Skills are staged under \`raw-skills/${name}/\` and processed with
\`pnpm run process:raw-skills\`.

## Layout

| Path | Purpose |
| --- | --- |
| \`.codex-plugin/plugin.json\` | Codex / ChatGPT plugin manifest (\`skills: ./skills/\`) |
| \`.grok-plugin/plugin.json\` | Grok Build plugin identity |
| \`skills/\` | Bundled skills |

## Install

- **Grok:** XYLEX Group marketplace (\`xylex-group/skills\`) as plugin \`${name}\`
- **Codex / ChatGPT:** repo marketplace \`.agents/plugins/marketplace.json\` entry \`${name}\` → \`./plugins/${name}\`

## License

MIT — see repository root \`LICENSE\`.
`;
}

function ensurePluginScaffold(
  pluginName: string,
  opts: CliOptions
): PluginResult["scaffold"] {
  const pluginRoot = join(PLUGINS_DIR, pluginName);
  const needsCreate = !existsSync(pluginRoot);

  if (!needsCreate) {
    // Ensure skills/ exists even on existing plugins
    const skillsDir = join(pluginRoot, "skills");
    if (!existsSync(skillsDir) && !opts.dryRun && !opts.check) {
      mkdirSync(skillsDir, { recursive: true });
    }
    return "exists";
  }

  if (opts.dryRun || opts.check) {
    return "would-create";
  }

  mkdirSync(join(pluginRoot, "skills"), { recursive: true });
  mkdirSync(join(pluginRoot, ".grok-plugin"), { recursive: true });
  mkdirSync(join(pluginRoot, ".codex-plugin"), { recursive: true });
  writeFileSync(join(pluginRoot, ".grok-plugin", "plugin.json"), grokPluginJson(pluginName));
  writeFileSync(join(pluginRoot, ".codex-plugin", "plugin.json"), codexPluginJson(pluginName));
  writeFileSync(join(pluginRoot, "README.md"), pluginReadme(pluginName));
  return "created";
}

// ---------------------------------------------------------------------------
// Skill sync
// ---------------------------------------------------------------------------

function syncSkill(
  pluginName: string,
  skill: SkillSource,
  opts: CliOptions
): SkillSyncResult {
  const dest = join(PLUGINS_DIR, pluginName, "skills", skill.skillName);
  const exists = existsSync(dest);

  if (exists && treesEqual(skill.sourceDir, dest)) {
    return { skill: skill.skillName, action: "unchanged" };
  }

  if (opts.dryRun || opts.check) {
    return {
      skill: skill.skillName,
      action: exists ? "would-update" : "would-create",
    };
  }

  if (exists) {
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(join(PLUGINS_DIR, pluginName, "skills"), { recursive: true });
  cpSync(skill.sourceDir, dest, { recursive: true });
  return {
    skill: skill.skillName,
    action: exists ? "updated" : "created",
  };
}

function mirrorRemoveMissing(
  pluginName: string,
  keep: Set<string>,
  opts: CliOptions
): string[] {
  const skillsDir = join(PLUGINS_DIR, pluginName, "skills");
  if (!isDir(skillsDir)) {
    return [];
  }
  const removed: string[] = [];
  for (const name of listDirs(skillsDir)) {
    if (keep.has(name)) {
      continue;
    }
    removed.push(name);
    if (!opts.dryRun && !opts.check) {
      rmSync(join(skillsDir, name), { recursive: true, force: true });
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// Marketplace registration
// ---------------------------------------------------------------------------

function loadJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function ensureGrokMarketplaceEntry(
  pluginName: string,
  opts: CliOptions
): PluginResult["marketplace"]["grok"] {
  if (!existsSync(GROK_MARKETPLACE)) {
    return "skipped";
  }
  const data = loadJson(GROK_MARKETPLACE);
  const plugins = Array.isArray(data.plugins) ? data.plugins : [];
  const exists = plugins.some(
    (p) =>
      typeof p === "object" &&
      p !== null &&
      "name" in p &&
      (p as { name: string }).name === pluginName
  );
  if (exists) {
    return "exists";
  }

  if (opts.dryRun || opts.check) {
    return "would-add";
  }

  const title = titleCasePlugin(pluginName);
  plugins.push({
    name: pluginName,
    description: `${title} agent skills for Grok Build (staged via raw-skills/${pluginName}).`,
    category: "development",
    source: {
      type: "local",
      path: `./plugins/${pluginName}`,
    },
    homepage: `https://github.com/xylex-group/${pluginName}`,
    keywords: [pluginName],
    version: "1.0.0",
    license: "MIT",
    author: {
      name: "XYLEX Group",
      url: "https://github.com/xylex-group",
    },
  });
  data.plugins = plugins;
  writeJson(GROK_MARKETPLACE, data);
  return "added";
}

function ensureCodexMarketplaceEntry(
  pluginName: string,
  opts: CliOptions
): PluginResult["marketplace"]["codex"] {
  if (!existsSync(CODEX_MARKETPLACE)) {
    return "skipped";
  }
  const data = loadJson(CODEX_MARKETPLACE);
  const plugins = Array.isArray(data.plugins) ? data.plugins : [];
  const exists = plugins.some(
    (p) =>
      typeof p === "object" &&
      p !== null &&
      "name" in p &&
      (p as { name: string }).name === pluginName
  );
  if (exists) {
    return "exists";
  }

  if (opts.dryRun || opts.check) {
    return "would-add";
  }

  plugins.push({
    name: pluginName,
    source: {
      source: "local",
      path: `./plugins/${pluginName}`,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Developer Tools",
  });
  data.plugins = plugins;
  writeJson(CODEX_MARKETPLACE, data);
  return "added";
}

// ---------------------------------------------------------------------------
// Downstream pipeline
// ---------------------------------------------------------------------------

function runCommand(label: string, command: string, args: string[]): number {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`  failed to spawn ${command}: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

function runPythonScript(scriptRel: string, extraArgs: string[] = []): number {
  const script = join(ROOT, scriptRel);
  // Prefer python3, fall back to python (Windows).
  for (const bin of ["python3", "python"]) {
    const probe = spawnSync(bin, ["--version"], {
      cwd: ROOT,
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    if (probe.status === 0) {
      return runCommand(
        `${bin} ${scriptRel}${extraArgs.length ? ` ${extraArgs.join(" ")}` : ""}`,
        bin,
        [script, ...extraArgs]
      );
    }
  }
  console.error("Neither python3 nor python found on PATH");
  return 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function processBatch(batch: PluginBatch, opts: CliOptions): PluginResult {
  const scaffold = ensurePluginScaffold(batch.pluginName, opts);
  const skills: SkillSyncResult[] = [];
  for (const skill of batch.skills) {
    skills.push(syncSkill(batch.pluginName, skill, opts));
  }

  let removedSkills: string[] = [];
  if (opts.mirror) {
    removedSkills = mirrorRemoveMissing(
      batch.pluginName,
      new Set(batch.skills.map((s) => s.skillName)),
      opts
    );
  }

  let marketplace: PluginResult["marketplace"] = {
    grok: "skipped",
    codex: "skipped",
  };
  if (!opts.syncOnly) {
    marketplace = {
      grok: ensureGrokMarketplaceEntry(batch.pluginName, opts),
      codex: ensureCodexMarketplaceEntry(batch.pluginName, opts),
    };
  }

  return {
    plugin: batch.pluginName,
    scaffold,
    skills,
    removedSkills,
    marketplace,
  };
}

function printResults(results: PluginResult[], opts: CliOptions) {
  console.log(
    opts.check || opts.dryRun
      ? "\nprocess-raw-skills plan\n"
      : "\nprocess-raw-skills\n"
  );

  let drift = 0;
  for (const r of results) {
    console.log(`plugin  ${r.plugin}`);
    console.log(`  scaffold     ${r.scaffold}`);
    if (r.scaffold === "would-create" || r.scaffold === "created") {
      drift++;
    }
    for (const s of r.skills) {
      const mark =
        s.action === "unchanged" ? "  " : s.action.startsWith("would") ? "~~" : "**";
      console.log(`  ${mark} skill  ${s.skill.padEnd(40)} ${s.action}`);
      if (s.action !== "unchanged") {
        drift++;
      }
    }
    if (r.removedSkills.length > 0) {
      for (const name of r.removedSkills) {
        console.log(
          `  ${opts.check || opts.dryRun ? "~~" : "**"} remove  ${name}`
        );
        drift++;
      }
    }
    if (!opts.syncOnly) {
      console.log(`  marketplace  grok=${r.marketplace.grok}  codex=${r.marketplace.codex}`);
      if (
        r.marketplace.grok === "would-add" ||
        r.marketplace.grok === "added" ||
        r.marketplace.codex === "would-add" ||
        r.marketplace.codex === "added"
      ) {
        drift++;
      }
    }
    console.log("");
  }

  return drift;
}

function main() {
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String((err as Error).message));
    process.exit(2);
    return;
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (!existsSync(RAW_DIR)) {
    console.error(
      `raw-skills/ not found at ${RAW_DIR}. Create it and place skills under raw-skills/<plugin>/…`
    );
    process.exit(1);
  }

  const batches = discoverBatches(opts.pluginFilter);
  if (batches.length === 0) {
    if (opts.pluginFilter) {
      console.error(
        `No processable skills for plugin "${opts.pluginFilter}" under raw-skills/.`
      );
      process.exit(1);
    }
    console.log(
      "No skills found under raw-skills/<plugin>/*/SKILL.md.\n" +
        "See raw-skills/README.md for the expected layout."
    );
    process.exit(0);
  }

  const results = batches.map((b) => processBatch(b, opts));
  const drift = printResults(results, opts);

  const skillCount = results.reduce((n, r) => n + r.skills.length, 0);
  console.log(
    `summary  plugins=${results.length}  skills=${skillCount}  changes=${drift}`
  );

  if (opts.check) {
    if (drift > 0) {
      console.error(
        `\ncheck failed: ${drift} change(s) pending. Run \`pnpm run process:raw-skills\` without --check.`
      );
      process.exit(1);
    }
    console.log("\ncheck OK — raw-skills and plugins are in sync.");
    process.exit(0);
  }

  if (opts.dryRun) {
    console.log("\ndry-run complete (no files written).");
    process.exit(0);
  }

  if (opts.syncOnly) {
    console.log("\nsync-only complete.");
    process.exit(0);
  }

  // Full e2e: regenerate plugin index + validate catalogs
  const indexCode = runPythonScript("scripts/generate-plugin-index.py");
  if (indexCode !== 0) {
    process.exit(indexCode);
  }

  const validateCode = runPythonScript("scripts/validate-catalog.py");
  if (validateCode !== 0) {
    process.exit(validateCode);
  }

  console.log("\nprocess-raw-skills complete (sync + plugin-index + catalog validate).");
  process.exit(0);
}

if (import.meta.main) {
  main();
}
