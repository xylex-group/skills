// hooks/src/vercel-config.mts
import { safeReadFile } from "./hook-env.mjs";

var KEY_SKILL_MAP = {
  buildCommand: ["deployments-cicd"],
  // Build / CI-CD
  builds: ["deployments-cicd"],
  cleanUrls: ["routing-middleware"],
  devCommand: ["deployments-cicd"],
  framework: ["deployments-cicd"],
  // Functions / compute
  functions: ["vercel-functions"],
  headers: ["routing-middleware"],
  ignoreCommand: ["deployments-cicd"],
  installCommand: ["deployments-cicd"],
  outputDirectory: ["deployments-cicd"],
  // Routing
  redirects: ["routing-middleware"],
  regions: ["vercel-functions"],
  rewrites: ["routing-middleware"],
  trailingSlash: ["routing-middleware"],
};
var VERCEL_JSON_SKILLS = /* @__PURE__ */ new Set([
  "deployments-cicd",
  "routing-middleware",
  "vercel-functions",
]);
function resolveVercelJsonSkills(filePath) {
  const content = safeReadFile(filePath);
  if (content === null) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const keys = Object.keys(parsed);
  const relevantSkills = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const skills = KEY_SKILL_MAP[key];
    if (skills) {
      for (const s of skills) {
        relevantSkills.add(s);
      }
    }
  }
  return { keys, relevantSkills };
}
function isVercelJsonPath(filePath) {
  if (typeof filePath !== "string") {
    return false;
  }
  const normalized = filePath.replace(/\\/g, "/");
  const base = normalized.split("/").pop();
  return base === "vercel.json";
}

export { isVercelJsonPath, resolveVercelJsonSkills, VERCEL_JSON_SKILLS };
