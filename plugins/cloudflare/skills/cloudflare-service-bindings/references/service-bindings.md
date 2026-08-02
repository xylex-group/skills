# Cloudflare Worker-to-Worker Service Bindings

Use this reference when you need current Cloudflare-specific details instead of general reasoning.

## Core Model

- A service binding lets Worker A call Worker B without a public URL.
- The binding is declared in the caller's Wrangler config under `services`.
- The binding exposes a property on `env`.
- The target Worker must already exist in the same Cloudflare account when the caller is deployed.

## Wrangler Configuration

JSONC:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "worker-a",
  "main": "./src/index.ts",
  "services": [
    {
      "binding": "WORKER_B",
      "service": "worker-b"
    }
  ]
}
```

TOML:

```toml
"$schema" = "./node_modules/wrangler/config-schema.json"
name = "worker-a"
main = "./src/index.ts"

[[services]]
binding = "WORKER_B"
service = "worker-b"
```

Named entrypoint binding:

```jsonc
{
  "services": [
    {
      "binding": "ADMIN",
      "service": "todo-app",
      "entrypoint": "AdminEntrypoint"
    }
  ]
}
```

Fields:

- `binding`: caller-side `env` property name.
- `service`: deployed target Worker name.
- `entrypoint`: optional named `WorkerEntrypoint` export target for RPC.

## RPC Pattern

Target Worker:

```ts
import { WorkerEntrypoint } from "cloudflare:workers";

export default class CounterService extends WorkerEntrypoint {
  async fetch() {
    return new Response(null, { status: 404 });
  }

  async add(a: number, b: number) {
    return a + b;
  }
}
```

Caller Worker:

```ts
export default {
  async fetch(_request: Request, env: Env) {
    const result = await env.COUNTER_SERVICE.add(1, 2);
    return new Response(String(result));
  },
};
```

Use RPC when you want direct method calls and internal service APIs.

## HTTP Pattern

Caller Worker:

```ts
export default {
  async fetch(request: Request, env: Env) {
    return env.WORKER_B.fetch(request);
  },
};
```

Use HTTP when the target Worker is naturally modeled as a `fetch` service or when preserving request and response behavior is simpler than designing an RPC surface.

## Local Development

- Run one `wrangler dev` process per Worker in separate terminals, or
- Run one primary plus secondary configs with:

```bash
wrangler dev -c wrangler.jsonc -c ../worker-b/wrangler.jsonc
```

Rules:

- The first config is the primary Worker exposed over HTTP.
- Secondary Workers are only reachable through service bindings.
- Check Wrangler output for binding status like `connected` or `not connected`.

## Deployment Order

1. Deploy the target Worker first.
2. Deploy the caller Worker second.
3. Remove old methods or routes only after callers no longer use them.

If the caller references a target Worker that is not yet deployed, deployment fails.

## Lifecycle And Limits

- Service-binding calls are asynchronous and must be awaited.
- If the caller does not await the call, the callee may terminate early.
- Each service-binding request counts toward the subrequest limit.
- A single request can trigger at most 32 Worker invocations total; service-binding hops count toward that ceiling.
- Service-binding calls do not count toward simultaneous open connection limits.

## Troubleshooting Checklist

- Confirm the caller has the `services` binding.
- Confirm `binding` matches the caller's `env` usage.
- Confirm `service` matches the real deployed Worker name.
- Confirm the target Worker is on the same Cloudflare account.
- Confirm the target Worker is deployed before the caller.
- Confirm the correct interface is implemented:
  `WorkerEntrypoint` for RPC, `fetch` for HTTP.
- Confirm local dev sessions are connected before treating runtime failures as code bugs.
- Confirm failures are not from subrequest depth or the 32-invocation ceiling.
