/**
 * Ambient types for tsup-emitted hook modules imported as sibling `.mjs` files.
 * Keeps `tsc` green without dual declaration emit from tsup.
 */

interface XylexSkillEntry {
  bashPatterns: string[];
  importPatterns: string[];
  pathPatterns: string[];
  priority: number;
  skill?: string;
  [key: string]: unknown;
}

declare module "*.mjs" {
  export function extractFrontmatter(markdown: string): {
    yaml: string;
    body: string;
  };
  export function parseSkillFrontmatter(yaml: string): Record<
    string,
    unknown
  > & {
    name?: string;
    description?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  };
  export function buildSkillMap(skillsDir: string): {
    skills: Record<string, unknown>;
    diagnostics: Array<{ file: string; error: string; message: string }>;
    warnings: string[];
    warningDetails: unknown[];
  };
  export function validateSkillMap(...args: unknown[]): unknown;
  export function scanSkillsDir(...args: unknown[]): {
    skills: unknown[];
    diagnostics: unknown[];
  };

  export function globToRegex(pattern: string): RegExp;
  export function importPatternToRegex(pattern: string): RegExp;
  export function compileSkillPatterns(
    skills: Record<string, unknown>
  ): unknown;
  export function matchPathWithReason(...args: unknown[]): unknown;
  export function matchBashWithReason(...args: unknown[]): unknown;
  export function matchImportWithReason(...args: unknown[]): unknown;
  export function rankEntries(...args: unknown[]): unknown;

  export function isVercelJsonPath(path: string): boolean;
  export function resolveVercelJsonSkills(...args: unknown[]): unknown;
  export const VERCEL_JSON_SKILLS: string[];

  export type SkillEntry = XylexSkillEntry;
  export type ManifestSkill = XylexSkillEntry & { body?: string };
  export type ChainToRule = Record<string, unknown>;
  export type ValidationRule = Record<string, unknown>;
}
