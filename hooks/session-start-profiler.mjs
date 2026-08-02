import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { formatOutput, normalizeInput, setSessionEnv } from "./compat.mjs";
import { pluginRoot, safeReadJson, writeSessionFile } from "./hook-env.mjs";
import { createLogger, logCaughtError } from "./logger.mjs";
import { hasSessionStartActivationMarkers } from "./session-start-activation.mjs";
import { buildSkillMap } from "./skill-map-frontmatter.mjs";
import {
  refreshActiveSessionMarker,
  trackDauActiveToday,
} from "./telemetry.mjs";

var FILE_MARKERS = [
  { file: "skills", skills: ["create-xylex-skill"] },
  { file: "xylex.md", skills: ["create-xylex-skill"] },
  { file: ".xbp", skills: ["create-xylex-skill"] },
  { file: "xbp.toml", skills: ["create-xylex-skill"] },
];
var PACKAGE_MARKERS = {
  "@xylex-group/athena": ["create-xylex-skill"],
  "@xylex-group/athena-auth-ui": ["create-xylex-skill"],
  "xylex-group-plugin": ["create-xylex-skill"],
};
var SETUP_ENV_TEMPLATE_FILES = [".env.example", ".env.sample", ".env.template"];
var SETUP_DB_SCRIPT_MARKERS = [
  "db:push",
  "db:seed",
  "db:migrate",
  "db:generate",
];
var SETUP_AUTH_DEPENDENCIES = /* @__PURE__ */ new Set([
  "better-auth",
  "@xylex-group/athena",
]);
var SETUP_RESOURCE_DEPENDENCIES = {
  "@neondatabase/serverless": "postgres",
  "@xylex-group/athena": "athena",
  "drizzle-orm": "postgres",
};
var SETUP_MODE_THRESHOLD = 3;
var GREENFIELD_DEFAULT_SKILLS = ["create-xylex-skill"];
var GREENFIELD_SETUP_SIGNALS = {
  bootstrapHints: ["greenfield"],
  resourceHints: [],
  setupMode: true,
};
var SESSION_GREENFIELD_KIND = "greenfield";
var SESSION_LIKELY_SKILLS_KIND = "likely-skills";
var log = createLogger();
function readPackageJson(projectRoot) {
  return safeReadJson(join(projectRoot, "package.json"));
}
function profileProject(projectRoot) {
  const skills = /* @__PURE__ */ new Set();
  for (const marker of FILE_MARKERS) {
    if (existsSync(join(projectRoot, marker.file))) {
      for (const s of marker.skills) {
        skills.add(s);
      }
    }
  }
  const pkg = readPackageJson(projectRoot);
  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    for (const [dep, skillSlugs] of Object.entries(PACKAGE_MARKERS)) {
      if (dep in allDeps) {
        for (const s of skillSlugs) {
          skills.add(s);
        }
      }
    }
  }
  if (
    existsSync(join(projectRoot, "skills")) &&
    existsSync(join(projectRoot, "xylex.md"))
  ) {
    skills.add("create-xylex-skill");
  }
  return [...skills].sort();
}
function profileBootstrapSignals(projectRoot) {
  const bootstrapHints = /* @__PURE__ */ new Set();
  const resourceHints = /* @__PURE__ */ new Set();
  if (
    SETUP_ENV_TEMPLATE_FILES.some((file) => existsSync(join(projectRoot, file)))
  ) {
    bootstrapHints.add("env-example");
  }
  try {
    const dirents = readdirSync(projectRoot, { withFileTypes: true });
    if (
      dirents.some(
        (d) => d.isFile() && d.name.toLowerCase().startsWith("readme")
      )
    ) {
      bootstrapHints.add("readme");
    }
    if (dirents.some((d) => d.isFile() && /^drizzle\.config\./i.test(d.name))) {
      bootstrapHints.add("drizzle-config");
      bootstrapHints.add("postgres");
      resourceHints.add("postgres");
    }
  } catch (error) {
    logCaughtError(
      log,
      "session-start-profiler:profile-bootstrap-signals-readdir-failed",
      error,
      { projectRoot }
    );
  }
  if (existsSync(join(projectRoot, "prisma", "schema.prisma"))) {
    bootstrapHints.add("prisma-schema");
    bootstrapHints.add("postgres");
    resourceHints.add("postgres");
  }
  const pkg = readPackageJson(projectRoot);
  if (pkg) {
    const scripts =
      pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    const scriptEntries = Object.entries(scripts)
      .map(([name, cmd]) => `${name} ${typeof cmd === "string" ? cmd : ""}`)
      .join("\n");
    for (const marker of SETUP_DB_SCRIPT_MARKERS) {
      if (scriptEntries.includes(marker)) {
        bootstrapHints.add(marker.replace(":", "-"));
      }
    }
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    for (const dep of Object.keys(allDeps)) {
      const resource = SETUP_RESOURCE_DEPENDENCIES[dep];
      if (resource) {
        bootstrapHints.add(resource);
        resourceHints.add(resource);
      }
      if (SETUP_AUTH_DEPENDENCIES.has(dep)) {
        bootstrapHints.add("auth-secret");
      }
    }
  }
  const hints = [...bootstrapHints].sort();
  const resources = [...resourceHints].sort();
  return {
    bootstrapHints: hints,
    resourceHints: resources,
    setupMode: hints.length >= SETUP_MODE_THRESHOLD,
  };
}
function checkGreenfield(projectRoot) {
  let dirents;
  try {
    dirents = readdirSync(projectRoot, { withFileTypes: true });
  } catch (error) {
    logCaughtError(
      log,
      "session-start-profiler:check-greenfield-readdir-failed",
      error,
      { projectRoot }
    );
    return null;
  }
  if (dirents.some((d) => d.name === ".eve" && d.isDirectory())) {
    return null;
  }
  const hasNonDotDir = dirents.some((d) => !d.name.startsWith("."));
  const hasDotFile = dirents.some((d) => d.name.startsWith(".") && d.isFile());
  if (!(hasNonDotDir || hasDotFile)) {
    return { entries: dirents.map((d) => d.name).sort() };
  }
  return null;
}
var VERCEL_VERSION_ARGS = "--version".split(" ");
var NPM_VIEW_ARGS = "view vercel version".split(" ");
var SPAWN_STDIO = "ignore pipe ignore".split(" ");
var WINDOWS_EXECUTABLE_EXTENSIONS = (
  process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM"
)
  .split(";")
  .filter(Boolean);
function parseSessionStartInput(raw) {
  try {
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function detectSessionStartPlatform(input, env = process.env) {
  if (
    typeof env.CLAUDE_ENV_FILE === "string" &&
    env.CLAUDE_ENV_FILE.trim() !== ""
  ) {
    return "claude-code";
  }
  if (input && ("conversation_id" in input || "cursor_version" in input)) {
    return "cursor";
  }
  return "claude-code";
}
function normalizeSessionStartSessionId(input) {
  if (!input) {
    return null;
  }
  const sessionId = normalizeInput(input).sessionId;
  return sessionId || null;
}
function resolveSessionStartProjectRoot(env = process.env) {
  return env.CLAUDE_PROJECT_ROOT ?? env.CURSOR_PROJECT_DIR ?? process.cwd();
}
function collectBrokenSkillFrontmatterNames(files) {
  return [
    ...new Set(
      files
        .map((file) => file.replaceAll("\\", "/").split("/").at(-2) || "")
        .filter((skill) => skill !== "")
    ),
  ].sort();
}
function logBrokenSkillFrontmatterSummary(
  rootDir = pluginRoot(),
  logger = log
) {
  if (!logger.isEnabled("summary")) {
    return null;
  }
  try {
    const built = buildSkillMap(join(rootDir, "skills"));
    const brokenSkills = collectBrokenSkillFrontmatterNames(
      built.diagnostics.map((diagnostic) => diagnostic.file)
    );
    if (brokenSkills.length === 0) {
      return null;
    }
    const message = `WARNING: ${brokenSkills.length} skills have broken frontmatter: ${brokenSkills.join(", ")}`;
    logger.summary("session-start-profiler:broken-skill-frontmatter", {
      brokenSkillCount: brokenSkills.length,
      brokenSkills,
      message,
    });
    return message;
  } catch (error) {
    logCaughtError(
      logger,
      "session-start-profiler:broken-skill-frontmatter-check-failed",
      error,
      {
        rootDir,
      }
    );
    return null;
  }
}
function buildSessionStartProfilerEnvVars(args) {
  const envVars = {};
  if (args.greenfield) {
    envVars.XYLEX_PLUGIN_GREENFIELD = "true";
  }
  if (args.likelySkills.length > 0) {
    envVars.XYLEX_PLUGIN_LIKELY_SKILLS = args.likelySkills.join(",");
  }
  if (args.setupSignals.bootstrapHints.length > 0) {
    envVars.XYLEX_PLUGIN_BOOTSTRAP_HINTS =
      args.setupSignals.bootstrapHints.join(",");
  }
  if (args.setupSignals.resourceHints.length > 0) {
    envVars.XYLEX_PLUGIN_RESOURCE_HINTS =
      args.setupSignals.resourceHints.join(",");
  }
  if (args.setupSignals.setupMode) {
    envVars.XYLEX_PLUGIN_SETUP_MODE = "1";
  }
  return envVars;
}
function buildSessionStartProfilerUserMessages(greenfield, _cliStatus) {
  const messages = [];
  if (greenfield) {
    messages.push(
      "This is a greenfield project. Skip exploration \u2014 there is no existing code to discover. Start executing immediately."
    );
  }
  return messages;
}
function formatSessionStartProfilerCursorOutput(envVars, userMessages) {
  const additionalContext = userMessages.join("\n\n");
  return JSON.stringify(
    formatOutput("cursor", {
      additionalContext: additionalContext || void 0,
      env: envVars,
    })
  );
}
async function main() {
  const hookInput = parseSessionStartInput(readFileSync(0, "utf8"));
  const platform = detectSessionStartPlatform(hookInput);
  const sessionId = normalizeSessionStartSessionId(hookInput);
  const projectRoot = resolveSessionStartProjectRoot();
  refreshActiveSessionMarker();
  const greenfield = checkGreenfield(projectRoot);
  const shouldActivate =
    greenfield !== null ||
    !existsSync(projectRoot) ||
    hasSessionStartActivationMarkers(projectRoot);
  if (!shouldActivate) {
    log.debug("session-start-profiler:skipped-non-xylex-project", {
      projectRoot,
      reason: "non-empty-without-xylex-markers",
    });
    if (sessionId) {
      writeSessionFile(sessionId, SESSION_GREENFIELD_KIND, "");
      writeSessionFile(sessionId, SESSION_LIKELY_SKILLS_KIND, "");
    }
    if (platform === "cursor") {
      process.stdout.write(JSON.stringify(formatOutput("cursor", {})));
    }
    await trackDauActiveToday().catch(() => {});
    process.exit(0);
  }
  logBrokenSkillFrontmatterSummary();
  const userMessages = buildSessionStartProfilerUserMessages(greenfield);
  const likelySkills = greenfield
    ? GREENFIELD_DEFAULT_SKILLS
    : profileProject(projectRoot);
  const setupSignals = greenfield
    ? GREENFIELD_SETUP_SIGNALS
    : profileBootstrapSignals(projectRoot);
  const greenfieldValue = greenfield ? "true" : "";
  const likelySkillsValue = likelySkills.join(",");
  const envVars = buildSessionStartProfilerEnvVars({
    greenfield: greenfield !== null,
    likelySkills,
    setupSignals,
  });
  const cursorOutput =
    platform === "cursor"
      ? formatSessionStartProfilerCursorOutput(envVars, userMessages)
      : null;
  if (sessionId) {
    writeSessionFile(sessionId, SESSION_GREENFIELD_KIND, greenfieldValue);
    writeSessionFile(sessionId, SESSION_LIKELY_SKILLS_KIND, likelySkillsValue);
  }
  try {
    if (platform === "claude-code") {
      for (const [key, value] of Object.entries(envVars)) {
        if (
          key === "XYLEX_PLUGIN_GREENFIELD" ||
          key === "XYLEX_PLUGIN_LIKELY_SKILLS"
        ) {
          continue;
        }
        setSessionEnv(platform, key, value);
      }
    }
  } catch (error) {
    logCaughtError(
      log,
      "session-start-profiler:append-env-export-failed",
      error,
      {
        envVarCount: Object.keys(envVars).length,
        platform,
        projectRoot,
      }
    );
  }
  const additionalContext = userMessages.join("\n\n");
  if (platform === "claude-code" && additionalContext) {
    process.stdout.write(`${additionalContext}

`);
  }
  await trackDauActiveToday().catch(() => {});
  if (cursorOutput) {
    process.stdout.write(cursorOutput);
  }
  process.exit(0);
}
var SESSION_START_PROFILER_ENTRYPOINT = fileURLToPath(import.meta.url);
var isSessionStartProfilerEntrypoint = process.argv[1]
  ? resolve(process.argv[1]) === SESSION_START_PROFILER_ENTRYPOINT
  : false;
if (isSessionStartProfilerEntrypoint) {
  main();
}

export {
  buildSessionStartProfilerEnvVars,
  buildSessionStartProfilerUserMessages,
  checkGreenfield,
  detectSessionStartPlatform,
  formatSessionStartProfilerCursorOutput,
  logBrokenSkillFrontmatterSummary,
  normalizeSessionStartSessionId,
  parseSessionStartInput,
  profileBootstrapSignals,
  profileProject,
  resolveSessionStartProjectRoot,
};
