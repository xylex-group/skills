# ADR map (edge cluster)

All under `packages/athena-js/docs/adr/`.

| ADR | File | One-line decision |
| --- | --- | --- |
| 0015 | `0015-execution-transport-and-cloudflare-edge.md` | Inject `gatewayTransport`; edge is execution backend |
| 0016 | `0016-drop-in-edge-bindings-on-create-client.md` | `db.d1` / `storage.r2` on `createClient`; façades map only |
| 0017 | `0017-d1-sql-compiler-and-mutation-bounds.md` | SQLite compiler; range bounds; sparse batch counts |
| 0018 | `0018-hybrid-edge-remote-service-routing.md` | Remote root for billing; storage capability honesty |
| 0019 | `0019-execution-mode-resolution-and-runtime-facades.md` | auto/prefer; Worker env helpers |
| 0020 | `0020-client-capabilities-and-edge-layer-honesty.md` | `client.capabilities` L0–L3 honesty |

Upstream invariants:

- 0001 / 0014 — single materializer; thin façades only
- 0008 — routing precedence / service errors
- 0011 / 0012 — storage + stable namespaces

Narrative: `packages/athena-js/docs/cloudflare-edge-local.md`.

When changing contracts, update the owning ADR **and** the narrative guide in the same change set when behavior is user-visible.
