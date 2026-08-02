import { join } from "node:path";
import {
  pluginRoot as resolvePluginRoot,
  safeReadFile,
  syncSessionFileFromClaims,
  tryClaimSessionKey,
} from "./hook-env.mts";

const PLUGIN_ROOT = resolvePluginRoot();
const DEFAULT_CONTEXT_CHUNK_BUDGET_BYTES = 1800;
const CONTEXT_CHUNK_KIND = "seen-context-chunks";

interface ChunkSectionMapping {
  chunkId: string;
  heading: string;
}

export interface ManagedContextChunk {
  bytes: number;
  chunkId: string;
  content: string;
  heading: string;
  skill: string;
  wrapped: string;
}

interface ManagedContextChunkOptions {
  budgetBytes?: number;
  pluginRoot?: string;
  sessionId?: string | null;
}

const SKILL_TO_CHUNK: Record<string, ChunkSectionMapping> = {
  "ai-gateway": { chunkId: "ai-stack", heading: "AI Stack" },
  "ai-sdk": { chunkId: "ai-stack", heading: "AI Stack" },
  "chat-sdk": { chunkId: "ai-stack", heading: "AI Stack" },
  "deployments-cicd": {
    chunkId: "deploy-operations",
    heading: "Deploy and Operations",
  },
  "env-vars": {
    chunkId: "deploy-operations",
    heading: "Deploy and Operations",
  },
  eve: { chunkId: "ai-stack", heading: "AI Stack" },
  marketplace: {
    chunkId: "deploy-operations",
    heading: "Deploy and Operations",
  },
  "next-cache-components": {
    chunkId: "nextjs-platform",
    heading: "Next.js and Rendering",
  },
  "next-forge": {
    chunkId: "nextjs-platform",
    heading: "Next.js and Rendering",
  },
  "next-upgrade": {
    chunkId: "nextjs-platform",
    heading: "Next.js and Rendering",
  },
  nextjs: { chunkId: "nextjs-platform", heading: "Next.js and Rendering" },
  "routing-middleware": {
    chunkId: "compute-routing",
    heading: "Compute and Routing",
  },
  "runtime-cache": {
    chunkId: "compute-routing",
    heading: "Compute and Routing",
  },
  turbopack: { chunkId: "nextjs-platform", heading: "Next.js and Rendering" },
  "vercel-cli": {
    chunkId: "deploy-operations",
    heading: "Deploy and Operations",
  },
  "vercel-functions": {
    chunkId: "compute-routing",
    heading: "Compute and Routing",
  },
  "vercel-sandbox": {
    chunkId: "compute-routing",
    heading: "Compute and Routing",
  },
  "vercel-storage": { chunkId: "storage-data", heading: "Storage and Data" },
  workflow: { chunkId: "workflow-durable", heading: "Workflow and Durability" },
};

function extractDirectSection(markdown: string, headingText: string): string {
  const specText = headingText.trim().toLowerCase();
  const lines = markdown.split("\n");
  let startLine = -1;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const lineLevel = headingMatch[1].length;
    const lineText = headingMatch[2].trim().toLowerCase();
    if (lineText === specText) {
      startLine = i;
      headingLevel = lineLevel;
      break;
    }
  }

  if (startLine === -1) {
    return "";
  }

  const contentLines: string[] = [];
  for (let i = startLine + 1; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1].length <= headingLevel) {
      break;
    }
    contentLines.push(lines[i]);
  }

  return contentLines.join("\n").trim();
}

export function getManagedContextChunkForSkill(
  skill: string,
  options?: ManagedContextChunkOptions
): ManagedContextChunk | null {
  const mapping = SKILL_TO_CHUNK[skill];
  if (!mapping) {
    return null;
  }

  const root = options?.pluginRoot ?? PLUGIN_ROOT;
  const raw = safeReadFile(join(root, "xylex.md"));
  if (raw === null) {
    return null;
  }

  const content = extractDirectSection(raw, mapping.heading);
  if (!content) {
    return null;
  }

  const wrapped = `<!-- vercel-context-chunk:${mapping.chunkId} -->\n${content}\n<!-- /vercel-context-chunk:${mapping.chunkId} -->`;
  const bytes = Buffer.byteLength(wrapped, "utf8");
  const budget = options?.budgetBytes ?? DEFAULT_CONTEXT_CHUNK_BUDGET_BYTES;
  if (bytes > budget) {
    return null;
  }

  return {
    bytes,
    chunkId: mapping.chunkId,
    content,
    heading: mapping.heading,
    skill,
    wrapped,
  };
}

export function claimManagedContextChunk(
  chunkId: string,
  sessionId?: string | null
): boolean {
  if (!sessionId) {
    return true;
  }
  const claimed = tryClaimSessionKey(sessionId, CONTEXT_CHUNK_KIND, chunkId);
  if (claimed) {
    syncSessionFileFromClaims(sessionId, CONTEXT_CHUNK_KIND);
  }
  return claimed;
}

export function selectManagedContextChunk(
  orderedSkills: string[],
  options?: ManagedContextChunkOptions
): ManagedContextChunk | null {
  if (orderedSkills.length === 0) {
    return null;
  }

  const topSkill = orderedSkills[0];
  const chunk = getManagedContextChunkForSkill(topSkill, options);
  if (!chunk) {
    return null;
  }

  return claimManagedContextChunk(chunk.chunkId, options?.sessionId)
    ? chunk
    : null;
}

export { DEFAULT_CONTEXT_CHUNK_BUDGET_BYTES };
