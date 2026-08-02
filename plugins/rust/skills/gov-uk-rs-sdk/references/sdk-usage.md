# GOV.UK RS SDK Reference

## Table of Contents

1. Workspace map
2. Pick the right crate boundary
3. Auth and client construction
4. Request and response patterns
5. Crate-by-crate usage
6. Extension workflow
7. Validation and publishing
8. Common mistakes

## Workspace Map

Source of truth:

- `README.md` for the current supported usage and publish flow
- `src/lib.rs` for umbrella exports and feature-gated re-exports
- `src/harness/*` for the app-facing `ApiRequest` and `ApiResponse` layer
- `crates/gov-uk-sdk-core/*` for auth, HTTP, rate limiting, request building, negotiation, and error semantics
- `crates/gov-uk-ch-public-data/src/lib.rs` for the real endpoint helpers and DTOs that exist today
- `crates/gov-uk-ch-document/src/lib.rs` for the current stub state
- `examples/*.rs` and `tests/*.rs` for copy-paste usage and validation seams

Current workspace layout:

| Path | Package | Purpose |
| --- | --- | --- |
| `src/` | `gov-uk-rs-sdk` | Umbrella crate, `prelude`, and `harness` |
| `crates/gov-uk-sdk-core` | `gov-uk-sdk-core` | Shared client, auth, request builder, negotiation, and errors |
| `crates/gov-uk-ch-public-data` | `gov-uk-ch-public-data` | Read-only Companies House Public Data helpers |
| `crates/gov-uk-ch-document` | `gov-uk-ch-document` | Document API placeholder, not implemented yet |

## Pick the Right Crate Boundary

Use the umbrella crate when:

- writing examples, README snippets, or downstream app code
- you want `prelude::*` imports
- you want the stable `harness` layer with `ApiRequest`, `ApiResponse`, and `into_api_result`

Use `gov-uk-sdk-core` directly when:

- you need low-level control over `SdkClient`, `SdkRequest`, auth, or request methods
- you are building or extending a product crate
- you are working on shared HTTP behavior, error mapping, content negotiation, or rate limiting

Use `gov-uk-ch-public-data` when:

- you are consuming the currently implemented Companies House Public Data endpoints
- you want typed helpers like `get_company_profile(...)` and `search_companies(...)`

Use `gov-uk-ch-document` only when:

- reserving or extending the workspace for future document endpoints
- working on feature wiring, exports, or crate structure

Do not invent document endpoint helpers inside the stub crate unless the task is explicitly implementing them.

## Auth and Client Construction

Current auth modes from `crates/gov-uk-sdk-core/src/client.rs`:

- `Auth::ApiKey { key }`: Companies House public API basic auth, with the key as username and an empty password
- `Auth::Bearer { token }`: OAuth or bearer-token flows

Default base URL:

- `COMPANIES_HOUSE_API_ROOT = "https://api.company-information.service.gov.uk"`

Builder defaults:

- 30 second timeout
- Companies House rate limiter enabled
- base URL normalized to include a trailing slash

Use this standard constructor for most public-data work:

```rust
use gov_uk_rs_sdk::prelude::*;

let client = SdkClient::builder(Auth::ApiKey { key })
    .build()
    .expect("client build");
```

Use the builder overrides when the task actually needs them:

```rust
use gov_uk_sdk_core::{Auth, SdkClient};
use std::time::Duration;
use url::Url;

let client = SdkClient::builder(Auth::Bearer {
    token: token.to_string(),
})
.base_url(Url::parse("https://api.company-information.service.gov.uk/").expect("url"))
.timeout(Duration::from_secs(10))
.enable_companies_house_rate_limit(true)
.user_agent("gov-uk-rs-sdk/0.1.0")
.build()
.expect("client build");
```

Important:

- `.env.example` documents `COMPANIES_HOUSE_API_KEY` for local runs
- examples and the ignored live test call `dotenvy::dotenv()`
- there is no code today that auto-reads `GOV_UK_CH_API_BASE_URL`; use `SdkClientBuilder::base_url(...)` when a test or environment needs an override

## Request and Response Patterns

There are three normal entrypoints.

### 1. Product helper function

Use this for the simplest consumer path:

```rust
use gov_uk_rs_sdk::harness::into_api_result;
use gov_uk_rs_sdk::prelude::*;

let profile = into_api_result(get_company_profile(&client, "00000006").await)?;
println!("{:?}", profile.body().company_name);
```

### 2. Harness request builder

Use this when you still want the umbrella crate but need to shape the request yourself:

```rust
use gov_uk_rs_sdk::harness::ApiRequest;
use gov_uk_rs_sdk::prelude::*;

let profile = ApiRequest::get(&client, "company/00000006")?
    .accept_mime(COMPANY_PROFILE_ACCEPT_LATEST)
    .send_json_api::<CompanyProfile>()
    .await?;
```

### 3. Core request builder

Use this inside product crates or when editing the shared request layer:

```rust
use gov_uk_sdk_core::{Auth, SdkClient};

let profile = client
    .get("company/00000006")?
    .accept_mime("application/json")
    .send_json::<CompanyProfile>()
    .await?;
```

Response types:

- `NegotiatedResponse<T>` is the core success type
- `ApiResponse<T>` is the harness success type
- both preserve `Content-Type`
- deprecation metadata from `CH-Expiry-Date` is exposed as `ChDeprecation`

Error types:

- `SdkError::Unauthorized` for 401
- `SdkError::RateLimited { retry_after }` for 429
- `SdkError::NotAcceptable` for 406 when the `Accept` MIME or version is wrong
- `SdkError::Gone` for 410 when the requested representation is expired
- `SdkError::Api { status, messages }` when the body can be parsed into structured API messages
- `SdkError::UnexpectedResponse` for everything else

Writes and vendor content types:

- use `vendor_content_type(vendor_mime, version, validation)` to build Companies House vendor `Content-Type` values
- `Validation` supports `Full`, `Partial`, and `None`
- use `SdkRequest::vendor_json_body(...)` or `ApiRequest::vendor_json_body(...)` for JSON write endpoints when those are added

## Crate-by-Crate Usage

### `gov-uk-rs-sdk`

Use the root crate for downstream ergonomics.

Main exports:

- `pub use gov_uk_sdk_core::*`
- `pub use gov_uk_ch_public_data as ch_public_data` behind `ch-public-data`
- `pub use gov_uk_ch_document as ch_document` behind `ch-document`
- `prelude::*` for the common imports
- `harness::*` for `ApiRequest`, `ApiResponse`, and `into_api_result`

Feature flags:

- `ch-public-data` is the default feature
- `ch-document` enables the document stub crate
- `full` enables all current product crates

Prefer root-crate examples like this:

```toml
[dependencies]
gov-uk-rs-sdk = { version = "0.1", features = ["ch-public-data"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
```

### `gov-uk-sdk-core`

This crate owns the shared transport contract.

Key types and functions:

- `SdkClient`
- `SdkClientBuilder`
- `Auth`
- `SdkRequest`
- `SdkError`
- `NegotiatedResponse<T>`
- `ChDeprecation`
- `vendor_content_type(...)`
- `Validation`
- `Method`

Keep these concerns here:

- auth handling
- request method helpers
- query serialization
- body serialization
- rate limiting
- success/error mapping
- parsing `CH-Expiry-Date`

Do not move product-specific DTOs or endpoint paths into core.

### `gov-uk-ch-public-data`

This is the real product crate today.

Implemented surface:

- `get_company_profile(client, company_number)`
- `search_companies(client, &SearchCompaniesQuery { q })`
- `CompanyProfile`
- `CompanySearchHit`
- `SearchCompaniesResponse`
- `COMPANY_PROFILE_ACCEPT_LATEST`
- `COMPANY_PROFILE_VENDOR_MIME`

Use `COMPANY_PROFILE_ACCEPT_LATEST` for the simplest current profile call.

Use `COMPANY_PROFILE_VENDOR_MIME` when a future task needs to pin or compose a versioned MIME manually.

Search pattern:

```rust
let search = into_api_result(
    search_companies(&client, &SearchCompaniesQuery { q: "treasure" }).await,
)?;
println!("hits: {}", search.body().items.len());
```

When adding a new public-data endpoint:

1. add the DTOs and async helper in `crates/gov-uk-ch-public-data/src/lib.rs`
2. reuse `SdkClient` and `SdkRequest`
3. set the right `Accept` MIME
4. expose the new types/functions through the root `prelude` if they belong in the common consumer path
5. add or update an example and a focused test

### `gov-uk-ch-document`

Current state:

- `DOCUMENT_API_PATH_PREFIX`
- `DocumentApiStub`

This crate is a placeholder. If a task adds real document endpoints, the implementation should still lean on `gov-uk-sdk-core` for transport and errors.

## Extension Workflow

When extending an existing endpoint or adding a new one:

1. decide whether the change belongs in root, core, or a product crate
2. update the product helper first if the endpoint is product-specific
3. update root re-exports and `prelude` only if the surface should be public from the umbrella crate
4. add or update `examples/*.rs`
5. add or update focused tests under `tests/` or crate-local unit tests
6. refresh `README.md` and crate docs when the consumer-facing workflow changes

When adding a new product crate:

1. create `crates/gov-uk-ch-<name>/`
2. depend only on `gov-uk-sdk-core`
3. add the crate to root `[workspace.members]`
4. add it to `[workspace.dependencies]` with both `version` and `path`
5. wire it into root `[dependencies]`, `[features]`, and `src/lib.rs` re-exports
6. add examples and tests if the surface is usable

If a change adds new env vars:

- update `.env.example` with comments and safe dummy values
- update `.env` or `.env.local` locally as needed during development
- update the README or example docs in the same pass

## Validation and Publishing

Run Cargo in WSL2 on this machine.

Focused validation commands:

```powershell
wsl.exe bash -lc 'cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && cargo test --workspace'
wsl.exe bash -lc 'cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && cargo test -p gov-uk-rs-sdk --test smoke'
wsl.exe bash -lc 'cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && cargo test -p gov-uk-ch-public-data'
```

Ignored live test:

```powershell
wsl.exe bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && export COMPANIES_HOUSE_API_KEY='your_key' && cargo test -p gov-uk-rs-sdk --test live_public_data -- --ignored"
```

Examples:

```powershell
wsl.exe bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && export COMPANIES_HOUSE_API_KEY='your_key' && cargo run -p gov-uk-rs-sdk --example company_profile"
wsl.exe bash -lc "cd /mnt/c/Users/floris/Documents/GitHub/gov-uk-rs-sdk && export COMPANIES_HOUSE_API_KEY='your_key' && cargo run -p gov-uk-rs-sdk --example search_companies"
```

Publish order from the current README:

1. `cargo publish -p gov-uk-sdk-core`
2. `cargo publish -p gov-uk-ch-document`
3. `cargo publish -p gov-uk-ch-public-data`
4. `cargo publish -p gov-uk-rs-sdk`

Reason:

- the umbrella crate still depends on the workspace crates by package name
- Cargo packaging resolves all declared dependencies against crates.io
- the umbrella publish fails if the optional leaf crates have not been published yet

## Common Mistakes

- putting shared HTTP behavior in a product crate instead of `gov-uk-sdk-core`
- documenting base URL override as env-driven when the code only supports builder-based override
- bypassing the root `prelude` and `harness` in consumer-facing docs for no reason
- adding public APIs without updating examples or README snippets
- pretending `gov-uk-ch-document` is implemented
- running large Cargo test suites in native Windows instead of WSL2
