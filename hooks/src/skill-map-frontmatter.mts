/**
 * Standalone module that parses SKILL.md frontmatter to produce
 * the skill map shape used by the hook. This is the canonical source of truth.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { safeReadFile } from "./hook-env.mts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrontmatterResult {
  body: string;
  yaml: string;
}

export interface ValidationRule {
  message: string;
  pattern: string;
  severity: "error" | "recommended" | "warn";
  /** If set, skip this rule when the file content matches this regex. */
  skipIfFileContains?: string;
  /** Upgrade instruction mode. Defaults to "soft" when upgradeToSkill is set. */
  upgradeMode?: "hard" | "soft";
  /** If set, direct the agent to load a more specific skill for this violation. */
  upgradeToSkill?: string;
  /** Optional rationale for why the skill upgrade is needed. */
  upgradeWhy?: string;
}

export interface ChainToRule {
  /** Optional human-readable message explaining why the chain is triggered. */
  message?: string;
  /** Regex pattern to match against file contents after a PostToolUse write/edit. */
  pattern: string;
  /** Optional regex — if file content matches, skip this chain rule. */
  skipIfFileContains?: string;
  /** True when this rule was auto-synthesized from a validate upgradeToSkill rule at build time. */
  synthesized?: boolean;
  /** The skill slug to inject when the pattern matches. */
  targetSkill: string;
}

export interface RetrievalMetadata {
  aliases?: string[];
  entities?: string[];
  examples?: string[];
  intents?: string[];
}

export interface SkillFrontmatter {
  chainTo: ChainToRule[];
  description: string;
  metadata: Record<string, unknown>;
  name: string;
  retrieval?: RetrievalMetadata;
  summary: string;
  validate: ValidationRule[];
}

export interface ScannedSkill {
  chainTo: ChainToRule[];
  description: string;
  dir: string;
  metadata: Record<string, unknown>;
  name: string;
  retrieval?: RetrievalMetadata;
  summary: string;
  validate: ValidationRule[];
}

export interface Diagnostic {
  error: string;
  file: string;
  message: string;
}

export interface ScanResult {
  diagnostics: Diagnostic[];
  skills: ScannedSkill[];
}

export interface PromptSignals {
  allOf: string[][];
  anyOf: string[];
  minScore: number;
  noneOf: string[];
  phrases: string[];
}

export interface SkillConfig {
  bashPatterns: string[];
  chainTo?: ChainToRule[];
  docs: string[];
  importPatterns: string[];
  pathPatterns: string[];
  priority: number;
  promptSignals?: PromptSignals;
  retrieval?: RetrievalMetadata;
  sitemap?: string;
  summary: string;
  validate: ValidationRule[];
}

export interface WarningDetail {
  code: string;
  field: string;
  hint: string;
  message: string;
  skill: string;
  valueType: string;
}

export interface ErrorDetail {
  code: string;
  field: string;
  hint: string;
  message: string;
  skill: string;
  valueType: string;
}

export interface SkillMapResult {
  diagnostics: Diagnostic[];
  skills: Record<string, SkillConfig>;
  warningDetails: WarningDetail[];
  warnings: string[];
}

export type ValidationResult =
  | {
      ok: true;
      normalizedSkillMap: { skills: Record<string, SkillConfig> };
      warnings: string[];
      warningDetails: WarningDetail[];
    }
  | {
      ok: false;
      errors: string[];
      errorDetails: ErrorDetail[];
    };

// ---------------------------------------------------------------------------
// Internal YAML parser types
// ---------------------------------------------------------------------------

type YamlScalar = string | number;
type YamlValue = YamlScalar | YamlValue[] | YamlObject;
interface YamlObject {
  [key: string]: YamlValue;
}

interface BlockResult {
  nextIndex: number;
  value: YamlValue;
}

// ---------------------------------------------------------------------------
// Exported: extractFrontmatter
// ---------------------------------------------------------------------------

/**
 * Extract YAML frontmatter and body from a markdown string.
 * Frontmatter must be delimited by --- on its own line at the very start.
 */
export function extractFrontmatter(markdown: string): FrontmatterResult {
  // Strip BOM (U+FEFF) if present
  let src = markdown;
  if (src.charCodeAt(0) === 0xfe_ff) {
    src = src.slice(1);
  }
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    return { body: src, yaml: "" };
  }
  return { body: match[2], yaml: match[1] };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function invalidYaml(message: string, lineNumber?: number): Error {
  const location =
    typeof lineNumber === "number" ? ` (line ${lineNumber})` : "";
  return new Error(`Invalid YAML frontmatter: ${message}${location}`);
}

function isIgnorableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || line.trimStart().startsWith("#");
}

function nextSignificantLine(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (!isIgnorableLine(lines[i])) {
      return i;
    }
  }
  return -1;
}

function countIndent(line: string): number {
  let indent = 0;
  while (indent < line.length) {
    const char = line[indent];
    if (char === " ") {
      indent += 1;
      continue;
    }
    if (char === "\t") {
      throw invalidYaml("tab indentation is not allowed");
    }
    break;
  }
  return indent;
}

function parseYamlScalar(raw: string): YamlScalar {
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

function parseInlineArray(raw: string): YamlValue[] {
  const value = raw.trim();
  if (!(value.startsWith("[") && value.endsWith("]"))) {
    throw invalidYaml("inline array must start with '[' and end with ']'");
  }

  const inner = value.slice(1, -1);
  if (inner.trim() === "") {
    return [];
  }

  const items: string[] = [];
  let token = "";
  let quote: string | null = null;

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

function parseInlineValue(raw: string): YamlValue {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return parseInlineArray(value);
  }
  return parseYamlScalar(value);
}

/** Match YAML block scalar indicators: |, >, |-, |+, >-, >+ (optional chomping only). */
function parseBlockScalarIndicator(
  raw: string
): { style: ">" | "|"; chomp: "clip" | "strip" | "keep" } | null {
  const value = raw.trim();
  const match = value.match(/^([|>])([+-])?$/);
  if (!match) {
    return null;
  }
  const style = match[1] as ">" | "|";
  const chompChar = match[2];
  const chomp =
    chompChar === "-" ? "strip" : chompChar === "+" ? "keep" : "clip";
  return { chomp, style };
}

/**
 * Parse a YAML block scalar (literal `|` or folded `>`) starting after the
 * indicator line. Content lines must be indented more than `parentIndent`.
 *
 * Chomping:
 * - clip (default): strip trailing blank lines; `|` keeps one final newline, `>` does not
 *   (skill descriptions are typically single-line after fold)
 * - strip (`-`): strip all trailing newlines
 * - keep (`+`): keep trailing newlines captured from blank lines
 */
function parseBlockScalar(
  lines: string[],
  startIndex: number,
  parentIndent: number,
  style: ">" | "|",
  chomp: "clip" | "strip" | "keep"
): BlockResult {
  let index = startIndex;
  const contentLines: string[] = [];
  let contentIndent: number | null = null;

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

  // Drop leading blanks collected before first real content (shouldn't happen)
  while (contentLines.length > 0 && contentLines[0] === "") {
    contentLines.shift();
  }

  let text: string;
  if (style === "|") {
    text = contentLines.join("\n");
  } else {
    // Folded `>`: single newlines → spaces; blank lines → paragraph breaks.
    const paragraphs: string[] = [];
    let current: string[] = [];
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
    // keep trailing newlines already present in contentLines for literal;
    // for folded, trailing blanks already folded into trailing \n segments
    if (style === "|" && contentLines.length > 0 && !text.endsWith("\n")) {
      // no-op: join doesn't add final newline unless last line was ""
    }
  } else {
    // clip
    text = text.replace(/\n+$/, "");
    if (style === "|") {
      text = text.length > 0 ? `${text}\n` : "";
    }
  }

  return { nextIndex: index, value: text };
}

function parseYamlBlock(
  lines: string[],
  startIndex: number,
  indent: number
): BlockResult {
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
    const arr: YamlValue[] = [];

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

  const obj: YamlObject = {};
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

function parseSimpleYaml(yamlStr: string): YamlObject {
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

  return parsed.value as YamlObject;
}

// ---------------------------------------------------------------------------
// Exported: parseSkillFrontmatter
// ---------------------------------------------------------------------------

/**
 * Parse a YAML frontmatter string into a structured skill object.
 */
/**
 * Parse a raw validate: YAML value into an array of ValidationRule objects.
 * Malformed entries are silently skipped.
 */
function parseValidateRules(raw: unknown): ValidationRule[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rules: ValidationRule[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const obj = item as Record<string, unknown>;
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
    const rule: ValidationRule = {
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

/**
 * Parse a raw chainTo: YAML value into an array of ChainToRule objects.
 * Malformed entries are silently skipped.
 */
function parseChainToRules(raw: unknown): ChainToRule[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rules: ChainToRule[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const obj = item as Record<string, unknown>;
    if (typeof obj.pattern !== "string" || obj.pattern === "") {
      continue;
    }
    if (typeof obj.targetSkill !== "string" || obj.targetSkill === "") {
      continue;
    }
    const rule: ChainToRule = {
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

export function parseSkillFrontmatter(yamlStr: string): SkillFrontmatter {
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
        ? (doc.metadata as Record<string, unknown>)
        : {},
    name: typeof doc.name === "string" ? doc.name : "",
    summary: typeof doc.summary === "string" ? doc.summary : "",
    validate: parseValidateRules(doc.validate),
    ...(doc.retrieval != null &&
    typeof doc.retrieval === "object" &&
    !Array.isArray(doc.retrieval)
      ? {
          retrieval: parseRetrievalBlock(
            doc.retrieval as Record<string, unknown>
          ),
        }
      : {}),
  };
}

function parseRetrievalBlock(raw: Record<string, unknown>): RetrievalMetadata {
  const toStringArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v.filter((s): s is string => typeof s === "string" && s !== "");
  };
  return {
    aliases: toStringArray(raw.aliases),
    entities: toStringArray(raw.entities),
    examples: toStringArray(raw.examples),
    intents: toStringArray(raw.intents),
  };
}

// ---------------------------------------------------------------------------
// Exported: scanSkillsDir
// ---------------------------------------------------------------------------

/**
 * Scan a skills root directory and return parsed skill objects alongside
 * structured diagnostics for any files that failed to parse.
 * Expects structure: rootDir/<skill-name>/SKILL.md
 *
 * @internal Consumed by buildSkillMap and tests only — not part of the public API.
 */
export function scanSkillsDir(rootDir: string): ScanResult {
  const skills: ScannedSkill[] = [];
  const diagnostics: Diagnostic[] = [];
  let entries: string[];
  try {
    // Sort for deterministic ordering: readdirSync returns entries in
    // filesystem-dependent order (alphabetical-ish on macOS/APFS, arbitrary
    // on Linux/ext4), which would make the generated manifest differ by
    // platform and break the build:manifest:check drift gate in CI.
    entries = (readdirSync(rootDir) as string[]).sort();
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
      continue; // no SKILL.md in this directory
    }

    let parsed: SkillFrontmatter;
    try {
      const { yaml: yamlStr } = extractFrontmatter(content);
      parsed = parseSkillFrontmatter(yamlStr);
    } catch (err: unknown) {
      const error = err as Error;
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

// ---------------------------------------------------------------------------
// Shared: normalizePatternField
// ---------------------------------------------------------------------------

interface NormalizePatternFieldOpts {
  addWarning: (msg: string, detail: Omit<WarningDetail, "message">) => void;
  coerceStrings: boolean;
  field: string;
  fieldTypeHint: string; // e.g. "glob strings", "regex strings"
  raw: unknown;
  skill: string;
}

/**
 * Normalize a pattern field (pathPatterns, bashPatterns, importPatterns) from
 * an unknown value into a validated string[].
 *
 * Handles: string→array coercion (opt-in), non-array fallback, and filtering
 * of non-string / empty entries — all with structured warnings.
 */
/**
 * Parse a raw promptSignals value from frontmatter metadata into a typed
 * PromptSignals object. Returns undefined if the value is missing/invalid.
 */
interface ParsePromptSignalsOpts {
  addWarning?: (msg: string, detail: Omit<WarningDetail, "message">) => void;
  skill: string;
}

function parsePromptSignals(
  raw: unknown,
  opts?: ParsePromptSignalsOpts
): PromptSignals | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return;
  }
  const obj = raw as Record<string, unknown>;
  const skill = opts?.skill ?? "";
  const warn = opts?.addWarning;

  const toStringArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v.filter((x): x is string => typeof x === "string" && x !== "");
  };

  // Count empty strings before filtering (for warning)
  const countEmptyStrings = (v: unknown): number => {
    if (!Array.isArray(v)) {
      return 0;
    }
    return v.filter((x) => typeof x === "string" && x === "").length;
  };

  const toStringArrayArray = (v: unknown): string[][] => {
    if (!Array.isArray(v)) {
      return [];
    }
    return v
      .filter((g): g is unknown[] => Array.isArray(g))
      .map((g) =>
        g.filter((x): x is string => typeof x === "string" && x !== "")
      )
      .filter((g) => g.length > 0);
  };

  // Count non-array elements in allOf (for warning)
  const countNonArrayAllOf = (v: unknown): number => {
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

  // Emit warnings for malformed promptSignals
  if (warn) {
    // PROMPT_SIGNALS_EMPTY_PHRASES: phrases is an array but all entries are empty or filtered out
    if (Array.isArray(obj.phrases) && phrases.length === 0) {
      warn(`skill "${skill}": promptSignals.phrases is empty after filtering`, {
        code: "PROMPT_SIGNALS_EMPTY_PHRASES",
        field: "promptSignals.phrases",
        hint: "Add at least one non-empty phrase string",
        skill,
        valueType: "array",
      });
    }

    // Warn about empty strings in phrases
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

    // PROMPT_SIGNALS_INVALID_ALLOF_GROUP: allOf contains non-array elements
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

    // PROMPT_SIGNALS_LOW_MINSCORE: minScore below 1
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

  // Only return if there's at least one signal defined
  if (
    phrases.length === 0 &&
    allOf.length === 0 &&
    anyOf.length === 0 &&
    noneOf.length === 0
  ) {
    return;
  }

  return { allOf, anyOf, minScore, noneOf, phrases };
}

function normalizePatternField(opts: NormalizePatternFieldOpts): string[] {
  const { raw, skill, field, fieldTypeHint, coerceStrings, addWarning } = opts;

  let arr: unknown[];
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
    arr = raw as unknown[];
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

  return arr.filter((p: unknown, i: number): p is string => {
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

// ---------------------------------------------------------------------------
// Exported: buildSkillMap
// ---------------------------------------------------------------------------

/**
 * Build a skill map from SKILL.md frontmatter in the given skills directory.
 *
 * Output shape:
 * {
 *   "skills": {
 *     "<dir-name>": {
 *       "priority": <number>,    // defaults to 5
 *       "pathPatterns": [...],
 *       "bashPatterns": [...]
 *     }
 *   },
 *   "diagnostics": [...],
 *   "warnings": [...]
 * }
 */
export function buildSkillMap(rootDir: string): SkillMapResult {
  const skills: Record<string, SkillConfig> = {};
  const warnings: string[] = [];
  const warningDetails: WarningDetail[] = [];
  const { skills: parsed, diagnostics } = scanSkillsDir(rootDir);

  /**
   * Push a warning string (backwards compat) and a structured detail object.
   */
  function addWarning(
    msg: string,
    detail: Omit<WarningDetail, "message">
  ): void {
    warnings.push(msg);
    warningDetails.push({ ...detail, message: msg });
  }

  for (const skill of parsed) {
    const meta = skill.metadata || {};

    // Read pathPatterns (canonical) with fallback to deprecated filePattern
    let rawPathPatterns: unknown;
    if (meta.pathPatterns !== undefined) {
      rawPathPatterns = meta.pathPatterns;
    } else if (meta.filePattern === undefined) {
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

    // Read bashPatterns (canonical) with fallback to deprecated bashPattern
    let rawBashPatterns: unknown;
    if (meta.bashPatterns !== undefined) {
      rawBashPatterns = meta.bashPatterns;
    } else if (meta.bashPattern === undefined) {
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

    // Read importPatterns (optional -- regex patterns matched against file content imports)
    const rawImportPatterns: unknown =
      meta.importPatterns === undefined ? [] : meta.importPatterns;
    const filteredImportPatterns = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "importPatterns",
      fieldTypeHint: "package name strings",
      raw: rawImportPatterns,
      skill: skill.dir,
    });

    // Parse optional promptSignals from metadata (with warnings)
    const promptSignals = parsePromptSignals(meta.promptSignals, {
      addWarning,
      skill: skill.dir,
    });

    // Parse docs (optional array of URL strings)
    const rawDocs: unknown = meta.docs === undefined ? [] : meta.docs;
    const filteredDocs = normalizePatternField({
      addWarning,
      coerceStrings: true,
      field: "docs",
      fieldTypeHint: "URL strings",
      raw: rawDocs,
      skill: skill.dir,
    });

    // Parse sitemap (optional single URL string)
    const rawSitemap = meta.sitemap;
    const sitemap =
      typeof rawSitemap === "string" && rawSitemap.length > 0
        ? rawSitemap
        : undefined;

    // Key by directory name -- the canonical identity of a skill.
    // Frontmatter `name` may differ; directory name is authoritative.
    const entry: SkillConfig = {
      bashPatterns: filteredBashPatterns,
      docs: filteredDocs,
      importPatterns: filteredImportPatterns,
      pathPatterns: filteredPathPatterns,
      priority: (meta.priority as number) ?? 5,
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

// ---------------------------------------------------------------------------
// Shared skill-map validator / normalizer
// ---------------------------------------------------------------------------

const KNOWN_KEYS = new Set([
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

/**
 * Validate and normalize a skill-map object (as produced by buildSkillMap).
 * Returns { ok: true, normalizedSkillMap, warnings } or { ok: false, errors }.
 *
 * This is the single source of truth for skill-map validation -- both the
 * PreToolUse hook and the validate script should consume this function.
 */
export function validateSkillMap(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const errorDetails: ErrorDetail[] = [];
  const warnings: string[] = [];
  const warningDetails: WarningDetail[] = [];

  function addError(msg: string, detail: Omit<ErrorDetail, "message">): void {
    errors.push(msg);
    errorDetails.push({ ...detail, message: msg });
  }

  function addWarning(
    msg: string,
    detail: Omit<WarningDetail, "message">
  ): void {
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

  const rawObj = raw as Record<string, unknown>;
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

  const normalizedSkills: Record<string, SkillConfig> = {};

  for (const [skill, config] of Object.entries(
    skills as Record<string, unknown>
  )) {
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

    const cfg = config as Record<string, unknown>;

    // Warn on unknown keys
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

    // Normalize priority (default 5, matching buildSkillMap)
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

    // Normalize pattern fields — use the raw value if present, otherwise
    // default to [] so the helper correctly produces an empty array.
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

    // Normalize summary (optional string, default "")
    const summary = typeof cfg.summary === "string" ? cfg.summary : "";

    // Normalize docs (optional array of URL strings, default [])
    const docs = normalizePatternField({
      addWarning,
      coerceStrings: false,
      field: "docs",
      fieldTypeHint: "URL strings",
      raw: "docs" in cfg ? cfg.docs : [],
      skill,
    });

    // Normalize validate (optional array of ValidationRule, default [])
    const validate = parseValidateRules(cfg.validate);

    // Normalize promptSignals (optional, preserved if valid, with warnings)
    const promptSignals = parsePromptSignals(cfg.promptSignals, {
      addWarning,
      skill,
    });

    // Normalize sitemap (optional string URL)
    const sitemap =
      typeof cfg.sitemap === "string" && cfg.sitemap.length > 0
        ? cfg.sitemap
        : undefined;

    // Normalize chainTo (optional array of ChainToRule, default [])
    const chainTo = parseChainToRules(cfg.chainTo);

    const normalizedEntry: SkillConfig = {
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
      normalizedEntry.retrieval = cfg.retrieval as RetrievalMetadata;
    }
    normalizedSkills[skill] = normalizedEntry;
  }

  // Cross-reference: validate chainTo targetSkill references exist
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

  // Cross-reference: warn when upgradeToSkill exists without a matching chainTo
  for (const [skill, config] of Object.entries(normalizedSkills)) {
    if (!config.validate?.length) {
      continue;
    }
    const chainTargets = new Set(
      (config.chainTo ?? []).map((c: ChainToRule) => c.targetSkill)
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
