# Global error registry — architecture

## Domain types

```ts
export type ErrorCode = `${number}${number}${number}${number}${number}`;

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorAction =
  | "retry"
  | "configure-access"
  | "go-home"
  | "reauthorize-github-app"
  | "login"
  | "contact-support"
  | "dismiss"
  | "none";

export type ErrorIcon =
  | "alert-circle"
  | "lock"
  | "refresh"
  | "search"
  | "wifi-off"
  | "server"
  | "database"
  | "shield"
  | "unknown";

export type ErrorMatcher =
  | { type: "http-status"; status: number }
  | { type: "message-contains"; value: string; caseInsensitive?: boolean }
  | { type: "message-regex"; pattern: string; flags?: string }
  | { type: "error-name"; value: string }
  | { type: "provider"; provider: string }
  | { type: "predicate"; id: string };

export interface ApplicationErrorDefinition {
  code: ErrorCode;
  key: string;
  name: string;
  description: string;
  httpStatus?: number;
  provider?: string;
  category?: string;
  severity: ErrorSeverity;
  userMessage: string;
  developerMessage?: string;
  icon: ErrorIcon;
  action: ErrorAction;
  retryable: boolean;
  exposeDetails: boolean;
  reportable: boolean;
  matchers: ErrorMatcher[];
  metadata?: Record<string, unknown>;
}

export interface NormalizedApplicationError {
  original: unknown;
  message: string;
  name?: string;
  stack?: string;
  httpStatus?: number;
  provider?: string;
  errorCode?: string;
  requestId?: string;
  retryAfterSeconds?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface ResolvedApplicationError {
  definition: ApplicationErrorDefinition;
  normalized: NormalizedApplicationError;
  code: ErrorCode;
  display: {
    title: string;
    description: string;
    detail?: string;
    icon: ErrorIcon;
    action: ErrorAction;
  };
}
```

## Ports

```ts
export interface ErrorNormalizer {
  normalize(error: unknown): NormalizedApplicationError;
}

export interface ErrorRegistryPort {
  resolve(error: unknown): ResolvedApplicationError;
  getByCode(code: ErrorCode): ApplicationErrorDefinition | undefined;
}

export interface DiagnosticReporter {
  report(
    error: NormalizedApplicationError,
    resolved: ResolvedApplicationError,
  ): void;
}

export interface ErrorPresentationAdapter {
  toPresentation(resolved: ResolvedApplicationError): ErrorPresentationModel;
}

export interface ErrorContextExtractor {
  extract(error: NormalizedApplicationError): Record<string, unknown>;
}
```

Core registry imports **none** of: React, TanStack Router, HeroUI, Tailwind,
`window`/`document`/`fetch` types as hard deps (normalization adapters may live
beside the core).

## Categories the registry must cover

- Native HTTP errors (by status)
- Provider errors: GitHub, Linear, Stripe, Athena, Cloudflare
- Network / timeout
- Auth / authorization
- Resource not found
- Validation
- Rate limit
- Internal application
- Unknown fallback

## Code allocation

HTTP family: `{status}{index:02d}` → `40100`, `40301`, `42900`, …

Non-HTTP: reserved `9xxxx` (or existing repo convention). Inspect first.

Rules:

- Static definitions only  
- No silent reuse or renumber  
- Duplicate code/key fails `validate()`  
- Display renames keep codes  
- Code change = explicit migration  

## Resolve algorithm (sketch)

1. `normalized = normalizer.normalize(error)`  
2. If `normalized.errorCode` matches a definition → that def  
3. Score each definition’s matchers against normalized (specificity tiers)  
4. Highest tier, then highest specificity score within tier  
5. Else `unknown` definition  

Specificity scoring should prefer:

- More matchers that all match (AND semantics within a definition)
- Regex over contains when both match
- Provider+status over status alone

## Validation checks

- Unique codes and keys  
- Valid 5-digit `ErrorCode`  
- At least one `unknown` / fallback definition  
- No unreachable matcher set (same matchers lower priority always shadowed)  
- `exposeDetails: true` only when detail is bounded/safe by design  
- Self-approve / Linear special cases registered as keys, not only UI  

## Adapter map

| Adapter | Role |
|---------|------|
| browser / Error | native Error + string |
| fetch/HTTP | status, body shape |
| Octokit/GitHub | status, `bad credentials`, integration messages |
| TanStack Query | unwrap `error` |
| TanStack Router | ErrorComponentProps → resolve |
| React presentation | icon component map, classNames |
| diagnostics | recordClientDiagnosticError + code/key |
| server/API | optional if monorepo has server error types |

## Package exports

```ts
// public surface
export {
  createErrorRegistry,
  applicationErrorRegistry,
  type ApplicationErrorDefinition,
  type ErrorCode,
  type ErrorRegistry,
  type NormalizedApplicationError,
  type ResolvedApplicationError,
};
```
