---
name: fix-pr-comments
description: >
  AUTO-RUN: when the user pastes GitHub PR review notifications (chatgpt-codex-connector,
  "New review comment on pull request #", !P1/!P2 Badge) OR github.com pull discussion URLs
  (#discussion_rNNNN / discussion_rNNNN), immediately launch workflow tool
  name=fix-pr-comments-xbp-v2 (global CLI-first XBP; no MCP) with args.paste=FULL message and
  args.discussion_urls=[each URL, deduped], plus pr if visible. Do not ask for confirmation first;
  do not only summarize. Fallback name=fix-pr-comments only if user asks for gh-centric path.
  Always apply create-test-for-pr-comment: original-case regression first, RED fail, then fix,
  then GREEN pass; reply on original discussion with SHA + proof.
---

# Fix PR Comments

End-to-end loop for GitHub PR review feedback (Codex bot, humans, bots).

**Default auto-run:** global **`fix-pr-comments-xbp-v2`** (`xbp github pr` shell CLI only).
Gh-centric `fix-pr-comments` and MCP `fix-pr-comments-xbp` remain available on request.

## Auto-run on paste (required)

If the user message looks like review-comment paste, **immediately** call:

```
workflow tool:
  name: fix-pr-comments-xbp-v2
  args: {
    "paste": "<entire user message verbatim>",
    "discussion_urls": ["…#discussion_r…", …],
    "pr": <N if visible, else omit>
  }
  agent_budget: 48
```

### Paste fingerprints (any one is enough)

- `chatgpt-codex-connector` or `chatgpt-codex-connector[bot]`
- `New review comment on pull request #`
- `!P1 Badge` / `!P2 Badge` / `P1 Badge` / `P2 Badge` (including HTML `<sub>` wrappers)
- Multiple blocks each with a short subject + failure body
- `https://github.com/{owner}/{repo}/pull/{N}#discussion_r{ID}` (or bare `#discussion_r{ID}`)

### Example paste shape

```text
chatgpt-codex-connector[bot]
[xylex-group/athena] New review comment on pull request #508: feat(...)
!P2 Badge Exclude relations already supplied by extensions

When both extensions and relations are selected, ...
```

### Do not

- Ask “want me to fix these?” before launching
- Only list subjects without running the workflow
- Drop the paste body when calling the tool (always pass full text as `args.paste`)

### After launch

- Tell the user the run display name from `/workflows`
- Stay available for resume/verify pauses
- When complete, summarize SHA + comment→test table from the workflow report

## Manual invocation

```text
/workflow fix-pr-comments-xbp-v2 {"paste":"..."}
/workflow fix-pr-comments-xbp-v2 {"pr":508,"max_comments":12,"discussion_urls":["…"]}
/workflow fix-pr-comments {"paste":"..."}   # gh-centric only if requested
/fix-pr-comments-xbp-v2
```

## Prerequisites

- **`xbp` on PATH** (`xbp --commands`) for default v2 path
- `gh` authenticated for checkout / `user -q .login`
- No XBP MCP server required for v2

## In-workflow steps (default: `~/.grok/workflows/fix-pr-comments-xbp-v2.rhai`)

1. **Inventory** — parse `args.paste` and/or `gh` review comments; resolve PR `head_ref`; detect **already_replied**  
2. **Hard scope** — if `discussion_urls` / `comment_ids` / paste `discussion_r` IDs are present, **only those IDs** enter the pipeline (hermetic filter after inventory; inventory must not invent open-PR P1s)  
3. **Reclassify** — re-scan thread replies; force `already_replied=true` when our Fixed fingerprint exists  
4. **Checkout** — PR head branch before any edits  
5. **Select** — P1 then P2; **skip re-fix** when `already_replied`  
6. **Fix** — red→green per work item (already-replied → no re-work)  
7. **Verify** — re-run suites for work items only  
8. **Pre-ship** — re-scan threads; **demote** `fixed`/`already_fixed` → `already_replied` when a prior our Fixed exists (blocks spam even if inventory lied)  
9. **Ship** — allowlist-only commit; Fixed only for rows still fixed/already_fixed after demote; resolve already_replied  
10. **Report** — SHA + proof table + reply log

### Branch + scoped commit rules (required)

- **Always check out the PR head** after inventory unless `args.skip_checkout: true`.
- Prefer: `gh pr checkout <N> --repo <owner>/<repo>`.
- On dirty worktree: stash with a clear message only if switching branches; never `reset --hard` / `clean -fd`.
- **Never commit on the wrong branch.** Ship re-verifies `git branch --show-current`.
- **Stage only allowlisted paths** built from all fix results: union of `files_changed[]` + `test_file`.
- **Forbidden:** `git add -A`, `git add .`, `git add -u`, sweeping pathspecs.
- **Required:** `git add -- <path1> <path2> ...` for each allowlisted path that changed.
- Unrelated dirty files stay unstaged and appear in `files_skipped`.
- Optional escape hatch only: `args.allow_unrelated_commit: true` (still prefer allowlist).

### Already replied (skip re-do + resolve)

If inventory finds **our** reply already on the thread (`gh api user` login match, or body fingerprint `Fixed on tip` + `**What changed:**` / `**Proof:**`):

- **Do not** re-run red→green or re-implement the fix
- **Do not** post another reply
- Status `already_replied`; Ship **resolves** the review thread (GraphQL `resolveReviewThread`) when `resolve_already_replied` is true (default)

| Arg | Default | Meaning |
|-----|---------|---------|
| `skip_already_replied` | `true` | Skip re-fix when we already replied |
| `resolve_already_replied` | `true` | Mark those threads resolved on GitHub |

### Reply on original discussion (required)

For every `fixed` / `already_fixed` comment, POST a reply on that review thread
(`#discussion_r{id}`), not a new top-level review. Include tip SHA, what changed, and proof.
**Never** re-post when status is `already_replied`.

```markdown
Fixed on tip `<short-sha>` (`<full-sha>`) on branch `<pr-head>`.

**What changed:** <1-3 sentences: concrete fix or re-verified already present; name files/functions>

**Commit:** `<short-sha>` — <commit subject, or "no new commit (already on tip)">

**Files:** <allowlisted paths actually committed, or none>

**Regression:** Red (original case failed) → fix → Green (same test passes).
Original case: <one line>.

**Proof:** `<test-file>` — **P?: <exact subject>**
```

`args.reply` defaults to true. Only skip when the user explicitly sets `reply: false`.

### Optional args

| Arg | Default | Meaning |
|-----|---------|---------|
| `skip_checkout` | `false` | Leave current branch (only if already on PR head) |
| `allow_unrelated_commit` | `false` | Allow staging non-allowlist paths (discouraged) |
| `push` | `true` | Push after scoped commit |
| `reply` | `true` | Reply on original discussion threads |
| `dry_run` | `false` | Inventory + plan only |

## Pair with

- **`create-test-for-pr-comment`** — mandatory test-per-comment rules  
- **`fix-pr-comments-xbp-v2`** — preferred global CLI-first path  
- **`fix-pr-comments-xbp`** — legacy MCP variant  
- **`gh-address-comments`** — alternate discovery  
- Workflow (default): `~/.grok/workflows/fix-pr-comments-xbp-v2.rhai`

## Definition of done

- [ ] Paste auto-launched workflow (or explicit `/workflow`)
- [ ] Working tree on the **PR head branch** before fixes
- [ ] All selected comments fixed or deferred
- [ ] One matching regression test per fixed comment (original found case)
- [ ] Red failed as expected, then green passed after fix
- [ ] Tests green
- [ ] Commit contains **only** allowlisted fix files (no `git add -A`)
- [ ] Commit pushed to PR head (if enabled)
- [ ] Reply posted on **each original discussion** with tip SHA, branch, files, fix summary, and proof test
