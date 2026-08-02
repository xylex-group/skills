// hooks/src/session-start-activation.mts
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { safeReadJson } from "./hook-env.mjs";

var ACTIVATION_MARKER_FILES = ["xylex.md", "xbp.toml", ".xbp", "athena.md"];
function readPackageJson(projectRoot) {
  return safeReadJson(join(projectRoot, "package.json"));
}
function packageJsonSignalsXylex(projectRoot) {
  const pkg = readPackageJson(projectRoot);
  if (!pkg) {
    return false;
  }
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };
  if (
    Object.keys(allDeps).some(
      (dep) =>
        dep === "xylex-group-plugin" ||
        dep.startsWith("@xylex-group/") ||
        dep === "create-athena-app"
    )
  ) {
    return true;
  }
  const scripts =
    pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  return Object.values(scripts).some(
    (value) =>
      typeof value === "string" && /\b(xbp|athena|xylex)\b/i.test(value)
  );
}
function hasSessionStartActivationMarkers(projectRoot) {
  if (
    ACTIVATION_MARKER_FILES.some((file) => existsSync(join(projectRoot, file)))
  ) {
    return true;
  }
  if (existsSync(join(projectRoot, "skills"))) {
    return true;
  }
  if (existsSync(join(projectRoot, ".xylex-group-plugin"))) {
    return true;
  }
  return packageJsonSignalsXylex(projectRoot);
}
function isGreenfieldDirectory(projectRoot) {
  let dirents;
  try {
    dirents = readdirSync(projectRoot, { withFileTypes: true });
  } catch {
    return false;
  }
  if (dirents.some((d) => d.name === ".eve" && d.isDirectory())) {
    return false;
  }
  const hasNonDotDir = dirents.some((d) => !d.name.startsWith("."));
  const hasDotFile = dirents.some((d) => d.name.startsWith(".") && d.isFile());
  return !(hasNonDotDir || hasDotFile);
}

export { hasSessionStartActivationMarkers, isGreenfieldDirectory };
