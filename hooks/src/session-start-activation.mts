import { type Dirent, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { safeReadJson } from "./hook-env.mjs";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, unknown>;
}

const ACTIVATION_MARKER_FILES: string[] = [
  "xylex.md",
  "xbp.toml",
  ".xbp",
  "athena.md",
];

function readPackageJson(projectRoot: string): PackageJson | null {
  return safeReadJson<PackageJson>(join(projectRoot, "package.json"));
}

function packageJsonSignalsXylex(projectRoot: string): boolean {
  const pkg = readPackageJson(projectRoot);
  if (!pkg) {
    return false;
  }

  const allDeps: Record<string, string> = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  if (
    Object.keys(allDeps).some(
      (dep: string) =>
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
    (value: unknown) =>
      typeof value === "string" && /\b(xbp|athena|xylex)\b/i.test(value)
  );
}

export function hasSessionStartActivationMarkers(projectRoot: string): boolean {
  if (
    ACTIVATION_MARKER_FILES.some((file: string) =>
      existsSync(join(projectRoot, file))
    )
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

export function isGreenfieldDirectory(projectRoot: string): boolean {
  let dirents: Dirent[];
  try {
    dirents = readdirSync(projectRoot, { withFileTypes: true });
  } catch {
    return false;
  }

  if (dirents.some((d: Dirent) => d.name === ".eve" && d.isDirectory())) {
    return false;
  }

  const hasNonDotDir = dirents.some((d: Dirent) => !d.name.startsWith("."));
  const hasDotFile = dirents.some(
    (d: Dirent) => d.name.startsWith(".") && d.isFile()
  );
  return !(hasNonDotDir || hasDotFile);
}
