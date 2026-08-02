/**
 * Structured log-level system for hook output.
 *
 * Levels (ascending verbosity):
 *   off     — no output (default, preserves existing behavior)
 *   summary — outcome + latency + issues only
 *   debug   — adds match reasons, dedup info, skill map stats
 *   trace   — adds per-pattern evaluation details
 *
 * Env vars (checked in order):
 *   XYLEX_PLUGIN_LOG_LEVEL  — explicit level name
 *   XYLEX_PLUGIN_DEBUG=1    — legacy, maps to "debug"
 *   XYLEX_PLUGIN_HOOK_DEBUG=1 — legacy, maps to "debug"
 */

import { randomBytes } from "node:crypto";

export type LogLevel = "off" | "summary" | "debug" | "trace";

const LEVELS = ["off", "summary", "debug", "trace"] as const;
const LEVEL_INDEX: Record<string, number> = {
  debug: 2,
  off: 0,
  summary: 1,
  trace: 3,
};

const XYLEX_PLUGIN_SHARED_LOGGER_CONTEXT_KEY =
  "__xylexPluginSharedLoggerContext__" as const;

interface CompleteCounts {
  boostsApplied?: string[];
  cappedCount: number;
  dedupedCount: number;
  devServerVerifyTriggered?: boolean;
  droppedByBudget?: string[];
  droppedByCap?: string[];
  injectedCount: number;
  injectedSkills?: string[];
  matchedCount: number;
  matchedSkills?: string[];
  tsxReviewTriggered?: boolean;
}

interface SharedLoggerContext {
  invocationId?: string;
}

type LoggerGlobal = typeof globalThis & {
  [XYLEX_PLUGIN_SHARED_LOGGER_CONTEXT_KEY]?: SharedLoggerContext;
};

export interface CreateLoggerOptions {
  invocationId?: string;
  level?: LogLevel;
}

export interface Logger {
  active: boolean;
  complete: (
    reason: string,
    counts?: Partial<CompleteCounts>,
    timing?: Record<string, number> | null
  ) => void;
  debug: (event: string, data: Record<string, unknown>) => void;
  elapsed: () => number;
  isEnabled: (minLevel: string) => boolean;
  issue: (
    code: string,
    message: string,
    hint: string,
    context: Record<string, unknown>
  ) => void;
  level: string;
  now: () => number;
  summary: (event: string, data: Record<string, unknown>) => void;
  t0: number;
  trace: (event: string, data: Record<string, unknown>) => void;
}

function readErrorField(
  error: Record<string, unknown>,
  field: string
): unknown {
  return field in error ? error[field] : undefined;
}

export function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const maybeCode =
      "code" in error &&
      typeof (error as Error & { code?: unknown }).code !== "undefined"
        ? { code: (error as Error & { code?: unknown }).code }
        : {};
    return {
      message: error.message,
      name: error.name,
      ...maybeCode,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    return {
      type: error.constructor?.name || "Object",
      ...(readErrorField(record, "name") === undefined
        ? {}
        : { name: readErrorField(record, "name") }),
      ...(readErrorField(record, "message") === undefined
        ? {}
        : { message: readErrorField(record, "message") }),
      ...(readErrorField(record, "code") === undefined
        ? {}
        : { code: readErrorField(record, "code") }),
      ...(readErrorField(record, "stack") === undefined
        ? {}
        : { stack: readErrorField(record, "stack") }),
    };
  }

  return { value: error };
}

export function logCaughtError(
  logger: Logger,
  event: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  logger.debug(event, { ...context, error: serializeErrorForLog(error) });
}

/**
 * Resolve the active log level from environment variables.
 */
export function resolveLogLevel(): LogLevel {
  const explicit = (process.env.XYLEX_PLUGIN_LOG_LEVEL || "")
    .toLowerCase()
    .trim();
  if (explicit && LEVEL_INDEX[explicit] !== undefined) {
    return explicit as LogLevel;
  }
  if (explicit) {
    console.error(
      `[xylex-group-plugin] Unknown XYLEX_PLUGIN_LOG_LEVEL="${explicit}". Valid levels: ${LEVELS.join(", ")}. Falling back to "off".`
    );
  }
  // Legacy boolean flags → debug
  if (
    process.env.XYLEX_PLUGIN_DEBUG === "1" ||
    process.env.XYLEX_PLUGIN_HOOK_DEBUG === "1"
  ) {
    return "debug";
  }
  return "off";
}

function getSharedLoggerContext(): SharedLoggerContext {
  const loggerGlobal = globalThis as LoggerGlobal;
  if (!loggerGlobal[XYLEX_PLUGIN_SHARED_LOGGER_CONTEXT_KEY]) {
    loggerGlobal[XYLEX_PLUGIN_SHARED_LOGGER_CONTEXT_KEY] = {};
  }
  return loggerGlobal[XYLEX_PLUGIN_SHARED_LOGGER_CONTEXT_KEY]!;
}

function resolveInvocationId(
  active: boolean,
  explicitInvocationId?: string
): string {
  if (!active) {
    return "";
  }
  if (explicitInvocationId) {
    return explicitInvocationId;
  }

  const sharedContext = getSharedLoggerContext();
  if (!sharedContext.invocationId) {
    sharedContext.invocationId = randomBytes(4).toString("hex");
  }
  return sharedContext.invocationId;
}

/**
 * Create a logger instance bound to the current process invocation.
 * All hook modules in the same process reuse one invocationId by default.
 */
export function createLogger(opts?: CreateLoggerOptions | LogLevel): Logger {
  const options = typeof opts === "string" ? { level: opts } : opts || {};
  const level = options.level || resolveLogLevel();
  const rank = LEVEL_INDEX[level] || 0;
  const active = rank > 0;
  const invocationId = resolveInvocationId(active, options.invocationId);

  const safeNow =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? () => performance.now()
      : () => Date.now();
  const t0 = active ? safeNow() : 0;

  function emit(
    minLevel: string,
    event: string,
    data: Record<string, unknown>
  ): void {
    if (rank < (LEVEL_INDEX[minLevel] || 0)) {
      return;
    }
    const line = JSON.stringify({
      event,
      invocationId,
      timestamp: new Date().toISOString(),
      ...data,
    });
    process.stderr.write(line + "\n");
  }

  return {
    active,

    complete(reason, counts, timing) {
      const {
        matchedCount = 0,
        injectedCount = 0,
        dedupedCount = 0,
        cappedCount = 0,
        tsxReviewTriggered,
        devServerVerifyTriggered,
        matchedSkills,
        injectedSkills,
        droppedByCap,
        droppedByBudget,
        boostsApplied,
      } = counts || {};
      emit("summary", "complete", {
        cappedCount,
        dedupedCount,
        injectedCount,
        matchedCount,
        reason,
        ...(tsxReviewTriggered === undefined ? {} : { tsxReviewTriggered }),
        ...(devServerVerifyTriggered === undefined
          ? {}
          : { devServerVerifyTriggered }),
        ...(matchedSkills ? { matchedSkills } : {}),
        ...(injectedSkills ? { injectedSkills } : {}),
        ...(droppedByCap && droppedByCap.length > 0 ? { droppedByCap } : {}),
        ...(droppedByBudget && droppedByBudget.length > 0
          ? { droppedByBudget }
          : {}),
        ...(boostsApplied && boostsApplied.length > 0 ? { boostsApplied } : {}),
        elapsed_ms: Math.round(safeNow() - t0),
        ...(timing ? { timing_ms: timing } : {}),
      });
    },

    debug(event, data) {
      emit("debug", event, data);
    },
    elapsed() {
      return Math.round(safeNow() - t0);
    },

    isEnabled(minLevel) {
      return rank >= (LEVEL_INDEX[minLevel] || 0);
    },

    issue(code, message, hint, context) {
      emit("summary", "issue", { code, context, hint, message });
    },
    level,
    now: safeNow,

    summary(event, data) {
      emit("summary", event, data);
    },
    t0,

    trace(event, data) {
      emit("trace", event, data);
    },
  };
}

/**
 * Structured decision log entry for skill routing traces.
 * Emits at debug level with consistent fields across all hooks.
 */
export interface DecisionFields {
  durationMs?: number;
  event: string;
  hook: string;
  reason?: string;
  score?: number;
  skill?: string;
  [key: string]: unknown;
}

/**
 * Emit a structured decision event at debug level.
 * Provides a consistent shape for skill routing decisions across hooks.
 */
export function logDecision(logger: Logger, fields: DecisionFields): void {
  logger.debug(
    `decision:${fields.event}`,
    fields as unknown as Record<string, unknown>
  );
}

export { LEVEL_INDEX, LEVELS };
