import MiniSearch from "minisearch";
import * as hookEnv from "./hook-env.mts";
import { createLogger, logCaughtError } from "./logger.mts";
import { CONTRACTIONS } from "./shared-contractions.mts";

export { CONTRACTIONS };

type RetrievalField = "aliases" | "intents" | "entities" | "examples";
type RetrievalBlock = Partial<Record<RetrievalField, unknown>>;
type LexicalDocument = Record<RetrievalField, string> & { id: string };
type NumberEnv = (name: string, fallback: number) => number;

export const SYNONYM_MAP = {
  analytics: ["tracking", "metrics", "telemetry"],
  api: ["endpoint", "route", "handler", "rest", "graphql"],
  auth: ["login", "signin", "session", "authentication", "credentials"],
  blob: ["storage", "upload", "s3", "file-upload"],
  build: ["bundler", "compile", "webpack", "esbuild", "vite"],
  // --- Vercel platform groups (20) ---
  cache: ["cdn", "revalidate", "isr", "edge-cache", "stale-while-revalidate"],
  chat: ["conversation", "messaging", "bot", "chatbot"],
  ci: [
    "continuous-integration",
    "pipeline",
    "github-actions",
    "automation",
    "workflow",
  ],
  cron: ["scheduled", "jobs", "recurring", "timer"],
  database: ["db", "sql", "postgres", "prisma", "drizzle"],
  // --- original 8 ---
  deploy: ["ship", "release", "go-live", "publish", "push"],
  domain: ["dns", "subdomain", "custom-domain"],
  email: ["smtp", "notification", "inbox", "sendgrid", "resend"],
  env: ["environment", "secret", "config", "variable"],
  error: ["exception", "error-handling", "bug", "crash", "stacktrace"],
  "feature-flag": ["toggle", "experiment", "flags", "ab-test"],
  image: ["og", "opengraph", "social-card", "satori"],
  log: ["logging", "debug", "trace", "stdout"],
  middleware: ["interceptor", "edge-middleware", "request-handler"],
  migration: ["schema-change", "database-migration", "migrate"],
  monorepo: ["workspace", "multi-package"],
  payment: ["stripe", "billing", "checkout", "subscription", "invoice"],
  // --- new expansion groups (9) ---
  perf: ["performance", "speed", "optimize", "latency", "slow"],
  preview: ["staging", "branch-deploy", "preview-deployment"],
  queue: ["background-jobs", "worker", "async-task"],
  "rate-limit": ["throttle", "quota", "rate-limiting"],
  realtime: [
    "websocket",
    "socket",
    "sse",
    "streaming",
    "live",
    "polling",
    "long-polling",
  ],
  redirect: ["rewrite", "url-rewrite", "next-rewrite"],
  routing: ["pages", "navigation", "router", "url", "path"],
  search: ["indexing", "filter", "fulltext", "algolia", "elasticsearch"],
  seo: ["sitemap", "meta-tags", "structured-data", "robots"],
  serverless: ["lambda", "edge-function", "cloud-function"],
  ssr: ["server-rendering", "server-component", "server-side", "rsc"],
  state: ["store", "redux", "zustand", "context", "signal"],
  style: ["css", "styling", "theme", "tailwind"],
  test: ["testing", "spec", "jest", "vitest"],
  webhook: ["callback", "event-hook", "http-callback"],
} as const;

const FIELDS: RetrievalField[] = ["aliases", "intents", "entities", "examples"];
const SEARCH_OPTIONS = {
  boost: { aliases: 2, entities: 1.5, examples: 1, intents: 3 },
  fuzzy: 0.2,
  prefix: true,
} as const;
const logger = createLogger();
const numberEnv: NumberEnv =
  (hookEnv as { numberEnv?: NumberEnv }).numberEnv ??
  ((name, fallback) => {
    const raw = process.env[name];
    const value =
      typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
    return Number.isFinite(value) ? value : fallback;
  });

const expansionLookup = buildExpansionLookup();
let lexicalIndex: MiniSearch<LexicalDocument> | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function buildExpansionLookup(): Record<string, string[]> {
  const lookup: Record<string, string[]> = {};
  for (const [root, aliases] of Object.entries(SYNONYM_MAP)) {
    const terms = [...new Set([root, ...aliases])];
    for (const term of terms) {
      lookup[term] = terms;
    }
  }
  return lookup;
}

function expandContractions(text: string): string {
  return Object.entries(CONTRACTIONS).reduce(
    (result, [from, to]) =>
      result.replaceAll(new RegExp(`\\b${from}\\b`, "g"), to),
    text.toLowerCase().replaceAll("’", "'")
  );
}

export function expandText(text: string, includeContractions = false): string {
  const source = includeContractions
    ? expandContractions(text)
    : text.toLowerCase();
  const tokens = source.match(/[a-z0-9-]+/g) ?? [];
  const seen = new Set<string>();
  const expanded: string[] = [];

  function add(term: string) {
    if (!seen.has(term)) {
      seen.add(term);
      expanded.push(term);
    }
  }

  let i = 0;
  while (i < tokens.length) {
    // Try joining adjacent tokens with a hyphen to match compound synonyms
    if (i + 1 < tokens.length) {
      const bigram = `${tokens[i]}-${tokens[i + 1]}`;
      if (expansionLookup[bigram]) {
        for (const term of expansionLookup[bigram]) {
          add(term);
        }
        i += 2;
        continue;
      }
    }
    for (const term of expansionLookup[tokens[i]] ?? [tokens[i]]) {
      add(term);
    }
    i++;
  }

  return expanded.join(" ");
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function resolveRetrievalBlock(skill: any): RetrievalBlock | null {
  const entry = asRecord(skill);
  const frontmatter = asRecord(entry?.frontmatter);
  const metadata = asRecord(entry?.metadata);
  const frontmatterMetadata = asRecord(frontmatter?.metadata);
  return (
    asRecord(entry?.retrieval) ||
    asRecord(metadata?.retrieval) ||
    asRecord(frontmatter?.retrieval) ||
    asRecord(frontmatterMetadata?.retrieval)
  );
}

function buildDocument(
  id: string,
  retrieval: RetrievalBlock
): LexicalDocument | null {
  const document = {
    aliases: expandText(stringList(retrieval.aliases).join(" ")),
    entities: expandText(stringList(retrieval.entities).join(" ")),
    examples: expandText(stringList(retrieval.examples).join(" ")),
    id,
    intents: expandText(stringList(retrieval.intents).join(" ")),
  };
  return FIELDS.some((field) => document[field] !== "") ? document : null;
}

export function initializeLexicalIndex(skillMap: Map<string, any>): void {
  const documents: LexicalDocument[] = [];

  for (const [skill, entry] of skillMap) {
    const retrieval = resolveRetrievalBlock(entry);
    const document = retrieval ? buildDocument(skill, retrieval) : null;
    if (document) {
      documents.push(document);
    }
  }

  try {
    lexicalIndex = new MiniSearch<LexicalDocument>({
      fields: FIELDS,
      searchOptions: SEARCH_OPTIONS,
      storeFields: ["id"],
    });
    lexicalIndex.addAll(documents);
    logger.debug("lexical-index:initialized", {
      indexedSkillCount: documents.length,
      totalSkillCount: skillMap.size,
    });
  } catch (error) {
    lexicalIndex = null;
    logCaughtError(logger, "lexical-index:initialize-failed", error, {
      indexedSkillCount: documents.length,
      totalSkillCount: skillMap.size,
    });
  }
}

export function searchSkills(
  query: string
): { skill: string; score: number }[] {
  if (!lexicalIndex) {
    return [];
  }

  const expandedQuery = expandText(query, true);
  if (expandedQuery === "") {
    return [];
  }

  try {
    const minScore = numberEnv("XYLEX_PLUGIN_LEXICAL_RESULT_MIN_SCORE", 4.0);
    return lexicalIndex
      .search(expandedQuery)
      .map((result) => ({ score: result.score, skill: String(result.id) }))
      .filter((result) => result.score >= minScore)
      .sort((left, right) => right.score - left.score);
  } catch (error) {
    logCaughtError(logger, "lexical-index:search-failed", error, { query });
    return [];
  }
}
