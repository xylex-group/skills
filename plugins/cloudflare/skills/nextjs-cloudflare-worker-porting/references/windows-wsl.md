# Windows and WSL

OpenNext explicitly warns that Windows is not fully supported. Treat Linux (WSL, CI, or native) as the production build path when Windows fails.

## Common Windows failures

| Failure | Typical cause |
|---------|---------------|
| `EPERM` during `opennextjs-cloudflare build` | Symlink creation blocked on NTFS |
| `ENOENT` for `/tmp/...` paths during `wrangler deploy` | Bundle built in WSL, deployed from Windows |
| Empty esbuild error after duplicate-key warnings | Usually a path-resolution failure in `handler.mjs`, not the warnings themselves |
| `npx: not found` or `ERR_PNPM_DLX_NO_BIN` in WSL | pnpm-only WSL without npm; wrangler delegates to `npx opennextjs-cloudflare` |

## Golden rule: same environment for build and deploy

OpenNext bakes absolute paths into `.open-next/server-functions/default/handler.mjs` (WASM imports, dynamic imports). If you build in WSL at `/tmp/my-build/...` and copy `.open-next` back to Windows, `wrangler deploy` on Windows will resolve those paths under the Windows tree and fail with `ENOENT`.

Do one of:

1. Build **and** deploy entirely in WSL (recommended on Windows workstations).
2. Build and deploy entirely on Linux CI.
3. Build and deploy entirely on native Windows only when OpenNext build actually succeeds there.

Copying `.open-next` across environments is fine for inspection, not for cross-environment deploy.

## WSL build pattern

A reliable pattern for monorepos on Windows:

1. `rsync` the app folder (exclude `node_modules`, `.next`, `.open-next`) into `/tmp/<project>-opennext-<app>/`.
2. Copy any repo-root inputs the build needs (e.g. shared OpenAPI specs).
3. Install with `pnpm install --frozen-lockfile` (use `--ignore-scripts` when postinstall assumes Windows paths).
4. Run `opennextjs-cloudflare build` in the Linux tree.
5. Deploy from that same tree with `opennextjs-cloudflare deploy -- --keep-vars`.

Provide npm/npx shims when scripts call `npm run ...`:

```bash
PNPM_BIN="$(command -v pnpm)"
cat >"$BUILD_ROOT/.bin/npm" <<EOF
#!/usr/bin/env bash
exec "$PNPM_BIN" "\$@"
EOF
chmod +x "$BUILD_ROOT/.bin/npm"
export PATH="$BUILD_ROOT/.bin:$PATH"
```

For deploy, prefer the local CLI over wrangler's `npx` delegation:

```bash
./node_modules/.bin/opennextjs-cloudflare deploy -- --keep-vars
```

Do not rely on `pnpm dlx opennextjs-cloudflare` — dlx may report `ERR_PNPM_DLX_NO_BIN`.

## Windows Next.js build tweaks

When Turbopack misbehaves on Windows for a specific app, `next build --webpack` in `package.json` can unblock the OpenNext inner build. Use only when needed; Linux CI may not require it.

For monorepos, pin `next.config` paths with `path.resolve(__dirname, ...)` so OpenNext resolves the app root correctly regardless of cwd.

## esbuild duplicate-key warnings

Large apps (Fumadocs, Radix, Floating UI) often emit `Duplicate key "options" in object literal` warnings during wrangler's bundle step. These are usually **warnings**, not the root failure. Read the wrangler log file for the actual `ENOENT` or plugin error when deploy exits with an empty message.

## apt install npm is not required

Installing system `npm` via `sudo apt` is unnecessary when pnpm shims cover `npm run` invocations. Avoid `sudo` in automated WSL flows — password prompts cause timeouts.