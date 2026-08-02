# API Framework Patterns

## Contents

1. Goal
2. Cross-framework rules
3. Express patterns
4. Hono patterns
5. Proxy and edge boundaries
6. Greenfield review checklist

## Goal

Prevent contract drift in new and existing APIs by choosing a clear authority for routes, params, validation, middleware behavior, and externally visible request and response semantics.

Use this reference when the codebase uses Express, Hono, or a proxy-heavy API shape and the real problem is not only a broken route but a weak contract ownership model.

## Cross-Framework Rules

- Define ingress validation where requests first enter the application.
- Keep route composition explicit and modular.
- Do not duplicate request and response shapes across router, middleware, client wrapper, docs, and tests without a reason.
- Make proxy-derived behavior explicit:
  - client IP
  - protocol
  - hostname
  - trusted forwarded headers
- Keep one stable error envelope and one obvious place where it is produced.
- If clients are generated or type-inferred, export the authority artifact they derive from.

## Express Patterns

Context7 docs used here:

- Express `Router` and `app.route()` for modular routing
- `app.param()` for route-parameter loading and validation
- built-in body parsers such as `express.json()` and `express.urlencoded()`
- four-argument error middleware for error handling
- `app.set('trust proxy', ...)` for forwarded-header behavior

### Recommended Ownership Pattern

For Express, keep drift down by treating these as explicit contract seams:

- `express.Router()` modules own route grouping and mount boundaries
- `app.route()` owns method grouping for a single path
- `app.param()` or equivalent parameter middleware owns param parsing and loading behavior
- body parser configuration owns accepted content-type and body-size expectations
- error middleware owns the public error envelope
- `trust proxy` configuration owns whether `req.ip`, `req.protocol`, and `req.hostname` may rely on forwarded headers

### Anti-Drift Moves

- Keep route declarations modular with `express.Router()` instead of scattering handlers across unrelated setup files.
- If multiple verbs share one path, consider `app.route()` so method ownership is visually grouped.
- Centralize param validation/loading instead of re-parsing `req.params` in each handler.
- Configure body parsers intentionally. If JSON, URL-encoded, raw, or text bodies differ by route, make that explicit at the route boundary.
- Keep one error middleware path for externally visible API errors. Express recognizes error middleware by the four-argument signature.
- Treat `trust proxy` as part of the public contract in deployments behind load balancers or reverse proxies. If it is wrong, auth, redirects, secure cookies, rate limiting, and audit logs can all drift from reality.

### Common Express Drift Smells

- README examples use one path shape while mounted routers use another
- handlers each parse the same `:id` differently
- body limits differ silently across routes
- proxy headers influence behavior in production but not in local assumptions
- route docs describe one error format while middleware emits another

## Hono Patterns

Context7 docs used here:

- `app.route()` composition for grouped routes and RPC type inference
- `zValidator(...)` plus `c.req.valid(...)` for validated request data
- exported `AppType` for typed RPC client generation
- chained middleware variable inference
- `describeRoute(...)` and `validator(...)` from `hono-openapi`

### Recommended Ownership Pattern

For Hono, lean into its typed composition:

- grouped sub-apps composed with `app.route()` own route families
- validator middleware owns ingress validation
- `c.req.valid(...)` is the only consumed request shape after validation
- exported `AppType` owns RPC client inference
- OpenAPI description middleware should be attached at the same route seam as validation, not maintained separately
- middleware-set variables should represent explicit contextual inputs, not shadow request contract data

### Anti-Drift Moves

- Group related routes into sub-apps and mount them with `app.route()` so the route family and inferred client shape stay aligned.
- Validate request inputs at ingress with schema-backed middleware such as `zValidator(...)`, then consume only `c.req.valid(...)` in handlers.
- Export `AppType` from the real route tree when using Hono RPC patterns so clients derive from the same authority as the handlers.
- When generating OpenAPI, place route description and validation together so docs and accepted inputs drift less easily.
- Use middleware variables for contextual state like auth or database handles, not as an ad hoc second request schema.

### Common Hono Drift Smells

- handler reads raw query/body values in some places and validated values in others
- clients are typed from a different route tree than the one deployed
- route composition changed but exported app type did not
- OpenAPI descriptions were edited separately from validator schemas
- middleware injects variables that callers start treating as part of the external contract

## Proxy And Edge Boundaries

Proxy behavior is part of the contract whenever downstream code depends on:

- `ip`
- `protocol`
- `host`
- secure redirect behavior
- tenant or subdomain routing

Rules:

- Make trusted forwarded-header behavior explicit in the framework entrypoint.
- Do not let auth, redirect, or URL-generation logic guess whether a proxy exists.
- If a proxy normalizes headers or rewrites paths, document that translation boundary as a contract seam.
- If the app serves both direct and proxied traffic, test both paths or document which one is authoritative.

In Express this especially includes `trust proxy`, which affects `req.ip`, `req.ips`, `req.protocol`, `req.secure`, and `req.hostname` based on forwarded headers.

## Greenfield Review Checklist

- What defines the route family: one router tree, one Hono app tree, or several competing entrypoints?
- Where are request params and bodies validated?
- Does every handler consume validated data or do some parse raw inputs again?
- What artifact should SDKs, RPC clients, or OpenAPI docs derive from?
- Is proxy-aware behavior configured explicitly?
- Is there one error envelope?
- If a route changes tomorrow, what fails immediately: tests, generated clients, docs checks, or nothing?
