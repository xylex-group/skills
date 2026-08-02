// fix-pr-comments-xbp-v2 — MAXIMUM SPEED + FIX ALL + CONCURRENT-SAFE + MULTI-PR FAN-OUT
// Rule: if we can detect scope → ONE agent per PR end-to-end. No bootstrap/fix/ship fan-out.
// Auto-detect discussion_r | issuecomment | paste from any args (query/objective/paste/urls).
// ALWAYS process every extracted discussion_r AND issuecomment id (mixed never drops either).
// MULTI-PR / MULTI-REPO: group every GitHub URL by owner/repo#pr. When 2+ groups exist,
// fan out parallel agents (one per group). Each uses an isolated git worktree + log dir
// under ~/.xbp/{worktrees,logs,repos}/<owner>-<repo>/pr-<N> so different PRs, branches,
// and repositories can run simultaneously in one workflow invocation without clobbering.
// Same-repo multi-PR (e.g. #512 + #513) and cross-repo mixes are both supported.
// Unscoped: fix ALL unresolved review threads (no silent cap unless max_comments is set).
// Avoid *tmp* worktree artifacts — prefer xbp -m / --body-file - / stdout.
// CLI-only xbp. Telemetry: scratch/telemetry.json + run.log + performance.md

let meta = #{
    name: "fix-pr-comments-xbp-v2",
    description: "Blazing-fast CLI-only PR review fixes. Concurrent-safe multi-PR/multi-repo: groups URLs by owner/repo#pr, parallel agents with isolated worktrees. Fixes ALL provided discussion + issue comments.",
    when_to_use: "Any PR review fix. Pass URL(s) or paste — even mixed PRs/repos/branches in one paste. Each PR is fixed in an isolated worktree in parallel.",
    phases: [
        #{ title: "Go", detail: "one agent per PR: isolate worktree→fix all→ship (parallel when multi)" },
        #{ title: "Wide", detail: "unscoped full inventory (still isolated; parallel when multi)" },
    ],
};

// --- tiny helpers ---

fn leading_digits(text) {
    let out = "";
    if text == () { return out; }
    let digits = "0123456789";
    let i = 0;
    let n = text.len();
    while i < n {
        let ch = text.sub_string(i, 1);
        if !digits.contains(ch) { break; }
        out += ch;
        i += 1;
    }
    out
}

fn extract_ids(texts, marker) {
    let ids = [];
    if texts == () { return ids; }
    for t in texts {
        if t == () { continue; }
        let parts = t.to_string().to_lower().split(marker);
        let pi = 0;
        for p in parts {
            if pi == 0 { pi += 1; continue; }
            pi += 1;
            let id = leading_digits(p);
            if id == "" { continue; }
            let seen = false;
            for e in ids { if e == id { seen = true; } }
            if !seen { ids.push(id); }
        }
    }
    ids
}

fn extract_pr(texts) {
    if texts == () { return (); }
    for t in texts {
        if t == () { continue; }
        let parts = t.to_string().to_lower().split("/pull/");
        let pi = 0;
        for p in parts {
            if pi == 0 { pi += 1; continue; }
            pi += 1;
            let id = leading_digits(p);
            if id != "" { return id; }
        }
    }
    ()
}

fn push_u(bag, val) {
    if val == () { return bag; }
    let s = val.to_string();
    if s == "" { return bag; }
    for e in bag { if e == s { return bag; } }
    bag.push(s);
    bag
}

fn is_paste(s) {
    if s == () { return false; }
    let t = s.to_string();
    if t.len() < 40 { return false; }
    let l = t.to_lower();
    // All supported review priorities (P0-P3); P0/P3-only pastes must not fall through to unscoped.
    l.contains("p0 badge") || l.contains("p1 badge") || l.contains("p2 badge") || l.contains("p3 badge")
        || l.contains("!p0") || l.contains("!p1") || l.contains("!p2") || l.contains("!p3")
        || l.contains("chatgpt-codex") || l.contains("codex review")
        || l.contains("badge/p0") || l.contains("badge/p1") || l.contains("badge/p2") || l.contains("badge/p3")
        || (l.contains("issuecomment-") && t.len() > 200)
}

fn collect_texts(args) {
    let bag = [];
    if args == () { return bag; }
    if type_of(args) == "string" { return push_u(bag, args); }
    if args.paste != () { bag = push_u(bag, args.paste); }
    if args.query != () { bag = push_u(bag, args.query); }
    if args.objective != () { bag = push_u(bag, args.objective); }
    if args.url != () { bag = push_u(bag, args.url); }
    if args.text != () { bag = push_u(bag, args.text); }
    if args.input != () { bag = push_u(bag, args.input); }
    if args.message != () { bag = push_u(bag, args.message); }
    if args.prompt != () { bag = push_u(bag, args.prompt); }
    if args.body != () { bag = push_u(bag, args.body); }
    if args.discussion_urls != () { for u in args.discussion_urls { bag = push_u(bag, u); } }
    if args.urls != () { for u in args.urls { bag = push_u(bag, u); } }
    if args.links != () { for u in args.links { bag = push_u(bag, u); } }
    bag
}

fn agent_ev(label, r) {
    let ok = false;
    let ms = 0;
    let tok = 0;
    let id = "";
    if r != () {
        if r.success == true { ok = true; }
        if r.duration_ms != () { ms = r.duration_ms; }
        if r.tokens_used != () { tok = r.tokens_used; }
        if r.agent_id != () { id = "" + r.agent_id; }
    }
    #{ kind: "agent", phase: "Go", label: label, success: ok, duration_ms: ms, tokens_used: tok, agent_id: id }
}

// --- multi-PR / multi-repo URL grouping ---

// Take a github.com/ path fragment until whitespace or common URL terminators.
fn take_url_chunk(s) {
    let out = "";
    if s == () { return out; }
    let text = s.to_string();
    let i = 0;
    let n = text.len();
    while i < n {
        let ch = text.sub_string(i, 1);
        if ch == " " || ch == "\t" || ch == "\n" || ch == "\r" { break; }
        if ch == ")" || ch == "]" || ch == ">" || ch == "\"" || ch == "'" || ch == "," || ch == ";" { break; }
        out += ch;
        i += 1;
        if i > 600 { break; }
    }
    out
}

// Parse owner/repo/pull/N from a path after github.com/ (or any string containing /pull/).
fn parse_owner_repo_pr(path) {
    if path == () { return (); }
    let lower = path.to_string().to_lower();
    if !lower.contains("/pull/") { return (); }
    let parts = lower.split("/pull/");
    if parts.len() < 2 { return (); }
    let head = parts[0];
    let segs = [];
    for seg in head.split("/") {
        if seg != "" { segs.push(seg); }
    }
    if segs.len() < 2 { return (); }
    let owner = segs[segs.len() - 2];
    let repo = segs[segs.len() - 1];
    if repo.len() > 4 && repo.sub_string(repo.len() - 4, 4) == ".git" {
        repo = repo.sub_string(0, repo.len() - 4);
    }
    let pr = leading_digits(parts[1]);
    if owner == "" || repo == "" || pr == "" { return (); }
    // Strip accidental host leftovers (e.g. if path was weird)
    if owner.contains(":") { return (); }
    #{ owner: owner, repo: repo, pr: pr }
}

fn repo_slug(owner, repo) {
    let o = if owner != () { owner.to_string() } else { "_detect" };
    let r = if repo != () { repo.to_string() } else { "_detect" };
    // Windows-safe: no slashes
    o + "-" + r
}

fn upsert_group(groups, owner, repo, pr, d_add, i_add, url) {
    let key = owner.to_string() + "/" + repo.to_string() + "#" + pr.to_string();
    let out = [];
    let found = false;
    for g in groups {
        if g.key == key {
            found = true;
            let d = g.d_ids;
            if d_add != () { for id in d_add { d = push_u(d, id); } }
            let ids_i = g.i_ids;
            if i_add != () { for id in i_add { ids_i = push_u(ids_i, id); } }
            let urls = g.urls;
            if url != () { urls = push_u(urls, url); }
            out.push(#{
                key: key,
                owner: owner.to_string(),
                repo: repo.to_string(),
                pr: pr.to_string(),
                d_ids: d,
                i_ids: ids_i,
                urls: urls,
            });
        } else {
            out.push(g);
        }
    }
    if !found {
        let d = [];
        if d_add != () { for id in d_add { d = push_u(d, id); } }
        let ids_i = [];
        if i_add != () { for id in i_add { ids_i = push_u(ids_i, id); } }
        let urls = [];
        if url != () { urls = push_u(urls, url); }
        out.push(#{
            key: key,
            owner: owner.to_string(),
            repo: repo.to_string(),
            pr: pr.to_string(),
            d_ids: d,
            i_ids: ids_i,
            urls: urls,
        });
    }
    out
}

// Group every github.com/.../pull/N URL (discussion_r, issuecomment, bare PR, files, reviews)
// by owner/repo#pr. Bare discussion_r / issuecomment ids without a URL attach to the only
// group, or to pr_arg / first group when multi.
fn extract_pr_groups(texts, pr_arg, repo_arg) {
    let groups = [];
    if texts == () { texts = []; }

    for t in texts {
        if t == () { continue; }
        let lower = t.to_string().to_lower();
        // github.com/ and www.github.com/ both work via this split
        let parts = lower.split("github.com/");
        let pi = 0;
        for p in parts {
            if pi == 0 { pi += 1; continue; }
            pi += 1;
            let chunk = take_url_chunk(p);
            let ref = parse_owner_repo_pr(chunk);
            if ref == () { continue; }
            let d = extract_ids([chunk], "discussion_r");
            let i = extract_ids([chunk], "issuecomment-");
            let full_url = "https://github.com/" + chunk;
            groups = upsert_group(groups, ref.owner, ref.repo, ref.pr, d, i, full_url);
        }
    }

    // Orphan bare ids (present in paste text but not inside a full github URL)
    let all_d = extract_ids(texts, "discussion_r");
    let all_i = extract_ids(texts, "issuecomment-");
    let assigned_d = [];
    let assigned_i = [];
    for g in groups {
        for id in g.d_ids { assigned_d = push_u(assigned_d, id); }
        for id in g.i_ids { assigned_i = push_u(assigned_i, id); }
    }
    let orphan_d = [];
    let orphan_i = [];
    for id in all_d {
        let seen = false;
        for e in assigned_d { if e == id { seen = true; } }
        if !seen { orphan_d.push(id); }
    }
    for id in all_i {
        let seen = false;
        for e in assigned_i { if e == id { seen = true; } }
        if !seen { orphan_i.push(id); }
    }

    if orphan_d.len() > 0 || orphan_i.len() > 0 {
        if groups.len() == 1 {
            let g0 = groups[0];
            groups = upsert_group(groups, g0.owner, g0.repo, g0.pr, orphan_d, orphan_i, ());
        } else if groups.len() == 0 {
            let owner = "_detect";
            let repo = "_detect";
            let pr = if pr_arg != () { pr_arg.to_string() } else { "" };
            if repo_arg != () {
                let rr = repo_arg.to_string();
                if rr.contains("/") {
                    let sp = rr.split("/");
                    if sp.len() >= 2 {
                        owner = sp[0];
                        repo = sp[1];
                    }
                }
            }
            if pr != "" {
                groups = upsert_group(groups, owner, repo, pr, orphan_d, orphan_i, ());
            }
            // else: leave empty; global d_ids/i_ids still drive single-agent path
        } else {
            // multi groups: prefer pr_arg match, else first group
            let placed = false;
            if pr_arg != () {
                let want = pr_arg.to_string();
                for g in groups {
                    if g.pr == want {
                        groups = upsert_group(groups, g.owner, g.repo, g.pr, orphan_d, orphan_i, ());
                        placed = true;
                        break;
                    }
                }
            }
            if !placed {
                let g0 = groups[0];
                groups = upsert_group(groups, g0.owner, g0.repo, g0.pr, orphan_d, orphan_i, ());
            }
        }
    }

    // pr_arg-only unscoped (no comment ids / no URLs with targets)
    if groups.len() == 0 && pr_arg != () {
        let owner = "_detect";
        let repo = "_detect";
        if repo_arg != () {
            let rr = repo_arg.to_string();
            if rr.contains("/") {
                let sp = rr.split("/");
                if sp.len() >= 2 {
                    owner = sp[0];
                    repo = sp[1];
                }
            }
        }
        groups = upsert_group(groups, owner, repo, pr_arg.to_string(), [], [], ());
    }

    groups
}

fn group_kind(g) {
    if g == () { return "unscoped"; }
    let nd = if g.d_ids != () { g.d_ids.len() } else { 0 };
    let ni = if g.i_ids != () { g.i_ids.len() } else { 0 };
    if nd > 0 && ni > 0 { return "mixed"; }
    if nd > 0 { return "discussion_r"; }
    if ni > 0 { return "issuecomment"; }
    "unscoped"
}

fn pr_url_for_group(g) {
    if g == () { return ""; }
    if g.urls != () && g.urls.len() > 0 {
        // Prefer a clean pull URL without fragment for xbp PR arg
        let u = g.urls[0].to_string();
        let lower = u.to_lower();
        if lower.contains("/pull/") {
            let parts = lower.split("/pull/");
            if parts.len() >= 2 {
                let prn = leading_digits(parts[1]);
                if prn != "" && g.owner != () && g.repo != () && g.owner != "_detect" {
                    return "https://github.com/" + g.owner + "/" + g.repo + "/pull/" + prn;
                }
            }
        }
        return u;
    }
    if g.owner != () && g.repo != () && g.pr != () && g.owner != "_detect" {
        return "https://github.com/" + g.owner + "/" + g.repo + "/pull/" + g.pr.to_string();
    }
    if g.pr != () { return g.pr.to_string(); }
    ""
}

fn label_for_group(g) {
    if g == () { return "go"; }
    let slug = repo_slug(g.owner, g.repo);
    "go-" + slug + "-pr" + g.pr.to_string()
}

// Concurrent multi-PR / multi-repo isolation preamble.
// owner/repo may be "_detect" when unknown — agent resolves via xbp/gh.
fn build_isolation_preamble(pr_arg, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push) {
    let p = "";
    p += "\n=== CONCURRENT ISOLATION (mandatory for multi-PR / multi-repo / multi-branch) ===\n";
    p += "Other fix-pr-comments-xbp-v2 agents may run in PARALLEL on DIFFERENT PRs/repos right now.\n";
    p += "NEVER switch the shared session workspace branch. NEVER `gh pr checkout PR` in the primary repo cwd.\n";
    p += "NEVER stash/reset/clean the primary workspace to 'make room' — that destroys parallel work.\n";
    p += "xbp github pr view/discussions/reply/resolve/comment/proof-table are network ops and are concurrent-safe.\n";
    p += "ALWAYS pass PR as a full GitHub URL when owner/repo are known (works across repos):\n";
    p += "  xbp github pr view https://github.com/OWNER/REPO/pull/N --json --slim\n";
    p += "  xbp github pr reply https://github.com/OWNER/REPO/pull/N --comment-id ID ...\n";
    let slug = repo_slug(owner, repo);
    if pr_arg != () {
        p += "PR=" + pr_arg.to_string() + "\n";
        p += "LOG_DIR=%USERPROFILE%\\.xbp\\logs\\fix-pr-comments-xbp-v2\\" + slug + "\\pr-" + pr_arg.to_string() + "\n";
    } else {
        p += "PR=detect from xbp/gh / INPUT URLs\n";
        p += "LOG_DIR=%USERPROFILE%\\.xbp\\logs\\fix-pr-comments-xbp-v2\\" + slug + "\\pr-<N>\n";
    }
    if owner != () && owner != "_detect" {
        p += "REPO=" + owner.to_string() + "/" + repo.to_string() + "\n";
        p += "REPO_SLUG=" + slug + "\n";
    } else {
        p += "REPO=detect from PR URL / xbp view / gh repo view\n";
        p += "REPO_SLUG=<owner>-<repo> from full_name\n";
    }
    p += "mkdir LOG_DIR if needed. Write last-agent.json + proof payload ONLY under LOG_DIR (never shared last-agent.json at parent).\n";
    if use_worktree && !skip_checkout {
        p += "USE_WORKTREE=true\n";
        if worktree_path_arg != () {
            p += "WORKTREE_PATH_HINT=" + worktree_path_arg.to_string() + "\n";
        } else {
            p += "WORKTREE_PATH_HINT=%USERPROFILE%\\.xbp\\worktrees\\" + slug + "\\pr-<N>\n";
            p += "  (per-repo + per-PR; Windows ok. Never share one worktree across two PRs.)\n";
        }
        p += "REPO_MIRROR=%USERPROFILE%\\.xbp\\repos\\" + slug + "\n";
        p += "Isolation steps (do FIRST before any code edit):\n";
        p += "1) xbp github pr view <PR_URL or N> --json --slim → head_ref, head_sha, repo full_name.\n";
        p += "2) Resolve git base for THIS repo only:\n";
        p += "   a) If session PRIMARY remote matches REPO (owner/repo): use PRIMARY as git dir for `git worktree` only — PRIMARY is never a reuse candidate for edits.\n";
        p += "   b) If PRIMARY is a DIFFERENT repo (cross-repo fan-out): ensure REPO_MIRROR exists:\n";
        p += "      - if missing: `gh repo clone OWNER/REPO REPO_MIRROR` (or git clone https://github.com/OWNER/REPO.git REPO_MIRROR)\n";
        p += "      - else: git -C REPO_MIRROR fetch origin --prune\n";
        p += "      Use REPO_MIRROR as the git dir for worktree add (never checkout foreign branches on PRIMARY).\n";
        p += "3) git -C <git_dir> worktree list --porcelain. PRIMARY / session cwd is never a reuse candidate — even when already on head_ref.\n";
        p += "   Reuse ONLY a distinct PR-scoped path under ~/.xbp/worktrees/<slug>/pr-N.\n";
        p += "   Before reuse: clean (`git -C WT status --porcelain` empty) and HEAD == head_sha (fetch+reset if clean but stale).\n";
        p += "   If dirty: re-isolate new path or hard-reset only on this PR-scoped tree when safe.\n";
        p += "4) If no distinct PR-scoped worktree: git -C <git_dir> fetch origin <head_ref> (or pull/PR/head). Then:\n";
        p += "   git -C <git_dir> worktree add WORKTREE_PATH <head_sha|origin/head_ref>  (detached HEAD fine)\n";
        p += "   If branch checked out only on PRIMARY, still add a new worktree — do not cd PRIMARY.\n";
        p += "5) ALL code edits, tests, commits, git status → only inside WORKTREE_PATH (cd WORKTREE_PATH).\n";
        if do_push {
            p += "6) git -C WORKTREE_PATH push -u origin HEAD:<head_ref> (or tracking branch).\n";
        } else {
            p += "6) NO PUSH (push:false). Do not git push; leave commits local on WORKTREE_PATH only.\n";
        }
        p += "7) Do NOT remove the worktree at end (reuse later after clean+head_sha validation). Do NOT touch PRIMARY branch.\n";
        p += "8) Return worktree_path + log_dir in JSON. worktree_path must NOT equal PRIMARY.\n";
    } else if skip_checkout {
        p += "USE_WORKTREE=false (skip_checkout). Stay on current tree ONLY if it already is THIS PR head; never switch shared branch for another PR.\n";
    } else {
        p += "USE_WORKTREE=false (caller disabled). Still avoid clobbering unrelated branches; prefer not changing session HEAD if already on PR head.\n";
    }
    p += "=== end CONCURRENT ISOLATION ===\n";
    p
}

fn flush(mode, events, meta_map) {
    let agents = 0;
    let failed = 0;
    let total_ms = 0;
    let total_tok = 0;
    let slow_ms = 0;
    let slow = "";
    for e in events {
        if e == () || e.kind != "agent" { continue; }
        agents += 1;
        let d = if e.duration_ms != () { e.duration_ms } else { 0 };
        let t = if e.tokens_used != () { e.tokens_used } else { 0 };
        total_ms += d;
        total_tok += t;
        if e.success != true { failed += 1; }
        if d > slow_ms { slow_ms = d; slow = if e.label != () { e.label } else { "" }; }
    }
    let totals = #{
        agents: agents,
        failed: failed,
        total_duration_ms: total_ms,
        total_tokens: total_tok,
        max_duration_ms: slow_ms,
        slowest_label: slow,
    };
    write_scratch_file("telemetry.json", json_encode(#{
        workflow: "fix-pr-comments-xbp-v2",
        schema_version: 4,
        mode: mode,
        events: events,
        totals: totals,
        meta: if meta_map != () { meta_map } else { #{} },
    }));
    let logl = "fix-pr-comments-xbp-v2\n";
    for e in events {
        if e == () || e.kind != "agent" { continue; }
        logl += "AGENT " + e.label + " ok=" + (if e.success { "1" } else { "0" })
            + " ms=" + e.duration_ms.to_string() + " tok=" + e.tokens_used.to_string() + "\n";
    }
    write_scratch_file("run.log", logl);
    let md = "# perf `" + mode + "`\n\n";
    md += "- agents: " + agents.to_string() + "\n";
    md += "- total_ms: " + total_ms.to_string() + "\n";
    md += "- tokens: " + total_tok.to_string() + "\n";
    md += "- slowest: " + slow + " (" + slow_ms.to_string() + "ms)\n";
    write_scratch_file("performance.md", md);
    log("telemetry mode=" + mode + " agents=" + agents.to_string() + " ms=" + total_ms.to_string() + " tok=" + total_tok.to_string());
    totals
}

// Minimal schema — less repair loops
let run_schema = #{
    "type": "object",
    "required": ["pr_number", "repo", "branch", "sha", "short_sha", "committed", "pushed", "replied", "results", "notes"],
    "properties": #{
        "pr_number": #{ "type": "integer" },
        "repo": #{ "type": "string" },
        "branch": #{ "type": "string" },
        "sha": #{ "type": "string" },
        "short_sha": #{ "type": "string" },
        "committed": #{ "type": "boolean" },
        "pushed": #{ "type": "boolean" },
        "replied": #{ "type": "boolean" },
        "proof_table_updated": #{ "type": "boolean" },
        "worktree_path": #{ "type": "string" },
        "log_dir": #{ "type": "string" },
        "notes": #{ "type": "string" },
        "tool_trace": #{
            "type": "array",
            "maxItems": 80,
            "items": #{
                "type": "object",
                "required": ["cmd", "ok"],
                "properties": #{
                    "cmd": #{ "type": "string" },
                    "ok": #{ "type": "boolean" },
                    "duration_ms_est": #{ "type": "integer" },
                },
            },
        },
        "results": #{
            "type": "array",
            "items": #{
                "type": "object",
                "required": ["comment_id", "status", "subject", "test_title", "test_file"],
                "properties": #{
                    "comment_id": #{ "type": "string" },
                    "status": #{ "type": "string" },
                    "subject": #{ "type": "string" },
                    "priority": #{ "type": "string" },
                    "test_title": #{ "type": "string" },
                    "test_file": #{ "type": "string" },
                    "files_changed": #{ "type": "array", "maxItems": 40, "items": #{ "type": "string" } },
                    "red_ran": #{ "type": "boolean" },
                    "red_failed_as_expected": #{ "type": "boolean" },
                    "green_ran": #{ "type": "boolean" },
                    "green_passed": #{ "type": "boolean" },
                    "red_command": #{ "type": "string" },
                    "green_command": #{ "type": "string" },
                    "original_case_summary": #{ "type": "string" },
                    "notes": #{ "type": "string" },
                },
            },
        },
        "files_committed": #{ "type": "array", "maxItems": 80, "items": #{ "type": "string" } },
    },
};

// Build the full go-agent prompt for one PR group (single or parallel fan-out member).
fn build_go_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, include_full_paste) {
    let d_ids = if g != () && g.d_ids != () { g.d_ids } else { [] };
    let i_ids = if g != () && g.i_ids != () { g.i_ids } else { [] };
    let kind = if kind_override != () { kind_override } else { group_kind(g) };
    let pr_s = if g != () && g.pr != () { g.pr.to_string() } else { "" };
    let owner = if g != () { g.owner } else { "_detect" };
    let repo = if g != () { g.repo } else { "_detect" };
    let pr_url = pr_url_for_group(g);

    let p = "";
    p += "FAST FIX ALL. Minimize tools. No exploration. No full-suite tests.\n";
    p += "MANDATORY: fix EVERY discussion_r id AND EVERY issuecomment id listed below for THIS PR only. Never drop a class. Never stop early after one id.\n";
    p += "You own ONLY this PR group — ignore other PRs/repos that may appear in ambient context.\n";
    p += "xbp only (no MCP/graphql) — xbp is blazingly fast; use it; avoid hand-rolled temp inventory scripts.\n";
    p += "LOGIN=`gh api user -q .login`\n";
    if pr_url != "" {
        p += "PR_URL=" + pr_url + "\n";
        p += "Use PR_URL as the <PR> argument to every xbp github pr command (cross-repo safe).\n";
    }
    p += build_isolation_preamble(if pr_s != "" { pr_s } else { () }, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push);
    p += "xbp github pr view PR_URL --json --slim\n";
    p += "xbp github pr discussion|discussions PR_URL --slim --detect-fixed-reply --our-author LOGIN --json\n";
    p += "xbp github pr reply PR_URL --comment-id ID -m BODY --if-not-fixed --our-author LOGIN --yes --json\n";
    p += "  (long Fixed body: --body-file - <<'EOF' ... EOF  OR pipe stdin — NOT a worktree tmp-*.md)\n";
    p += "xbp github pr resolve PR_URL --comment-id ID --yes --json\n";
    p += "xbp github pr comment PR_URL -m BODY --yes --json  # issuecomment/paste findings (top-level)\n";
    p += "xbp github pr proof-table PR_URL --input payload.json  # payload under LOG_DIR not repo tmp-*\n";
    if owner != () && owner != "_detect" {
        p += "issue body: gh api repos/" + owner + "/" + repo + "/issues/comments/ID --jq .body\n";
    } else {
        p += "issue body: gh api repos/O/R/issues/comments/ID --jq .body\n";
    }
    p += "\n=== TMP ARTIFACTS (critical) ===\n";
    p += "PREFER ZERO *tmp* files in the git worktree. Do not write tmp-*, .tmp-*, *tmp*.json/md/mjs for inventory/replies/proof.\n";
    p += "Use: xbp -m / --body-file - (stdin) / --json stdout; keep logs only under LOG_DIR (PR+repo-scoped).\n";
    p += "If you MUST create any file whose basename matches *tmp* (any case) inside the repo:\n";
    p += "  1) Immediately append a match-all gitignore line for the ENTIRE basename if missing:\n";
    p += "     **/exact-file-name.ext\n";
    p += "  2) Also ensure a prefix catch-all block exists once (create if absent):\n";
    p += "     # fix-pr-comments-xbp-v2 tmp artifacts (do not commit)\n";
    p += "     **/tmp*\n";
    p += "     **/.tmp*\n";
    p += "     (Do NOT add **/*tmp* — that hides legitimate names like notmpfile/tmpl)\n";
    p += "  3) Never stage/commit those tmp files. If .gitignore changed, include `.gitignore` in the allowlist commit.\n";
    p += "  4) Prefer deleting the tmp file after use once gitignored/unneeded.\n";
    p += "=== end TMP ===\n";
    if pr_s != "" { p += "PR=" + pr_s + "\n"; }
    p += "KIND=" + kind + " MAX=" + (if max_comments == () { "uncapped" } else { max_comments.to_string() }) + " (soft ceiling only when set; never skip listed targets)\n";
    p += "discussion_r_ids=" + d_ids.to_string() + "\n";
    p += "issuecomment_ids=" + i_ids.to_string() + "\n";

    if kind == "mixed" || (d_ids.len() > 0 && i_ids.len() > 0) {
        p += "SCOPE=ALL provided targets for THIS PR (mixed discussion_r + issuecomment). Fix both classes in one run.\n";
        p += "=== discussion_r (review threads) — ALL of these ===\n";
        for id in d_ids {
            p += "MUST_FIX discussion_r" + id + "\n";
        }
        p += "Per discussion_r: fetch→if Fixed fingerprint skip code fix→else RED→GREEN→allowlist commit once at end→reply --if-not-fixed→resolve.\n";
        p += "=== issuecomment bodies — ALL of these (each body may hold multiple P0/P1/P2/P3) ===\n";
        for id in i_ids {
            p += "MUST_FIX issuecomment-" + id + "\n";
        }
        p += "Per issuecomment: gh api issues/comments/ID body → parse EVERY P0/P1/P2/P3 block (--- separators). ids=issue-ICID-N.\n";
        p += "Do NOT inventory unrelated PR review threads beyond the listed discussion_r ids.\n";
        p += "RED→GREEN every finding. ONE commit for all code. Review reply+resolve for each discussion_r; ONE top-level pr comment summarizing issuecomment findings.\n";
    } else if kind == "discussion_r" {
        p += "SCOPE=ALL listed discussion_r ids for THIS PR (no silent drop). Do not invent unrelated threads.\n";
        for id in d_ids {
            p += "MUST_FIX discussion_r" + id + "\n";
        }
        p += "Per id: fetch→if already Fixed fingerprint skip fix→else RED→GREEN→allowlist commit once→reply --if-not-fixed→resolve.\n";
        p += "Process every id above before finishing.\n";
    } else if kind == "issuecomment" {
        p += "SCOPE=ALL listed issuecomment bodies for THIS PR. Parse EVERY P0/P1/P2/P3 in each body. Do not inventory PR review threads.\n";
        for id in i_ids {
            p += "MUST_FIX issuecomment-" + id + "\n";
        }
        p += "Fetch each body via gh api issues/comments/ID. ids=issue-ICID-N for each finding block.\n";
        p += "RED→GREEN each. ONE commit. ONE top-level pr comment listing all fixes. No review reply/resolve on synthetic ids.\n";
    } else if kind == "paste" {
        p += "SCOPE=ALL paste findings for THIS PR + any discussion_r/issuecomment links for THIS PR embedded in paste/INPUT.\n";
        p += "Parse every P0/P1/P2/P3. ids=paste-N (or real discussion_r / issue-* when links present).\n";
        p += "If INPUT embeds discussion_r and/or issuecomment links for THIS PR, treat those as MUST_FIX too (same rules as mixed).\n";
        p += "RED→GREEN each. Commit. Reply: review reply+resolve for discussion_r; top-level pr comment for issuecomment/paste-only findings.\n";
    } else {
        p += "SCOPE=unscoped FIX ALL unresolved review threads on THIS PR (P1 first). Do not stop at a small subset.\n";
        p += "xbp github pr discussions PR_URL --unresolved --slim --detect-fixed-reply --our-author LOGIN --json\n";
        if max_comments_explicit {
            p += "Soft max " + max_comments.to_string() + " (caller set max_comments); prefer fixing all unresolved within that cap.\n";
        } else {
            p += "UNCAPPED default (no silent cap unless max_comments is set): fix ALL unresolved; do not stop at 80.\n";
        }
        p += "RED→GREEN each. Commit once. reply+resolve each. proof-table.\n";
    }

    if use_worktree && !skip_checkout {
        p += "Checkout policy: PR-scoped git worktree only (see CONCURRENT ISOLATION). No shared `gh pr checkout`.\n";
    } else if skip_checkout {
        p += "Skip checkout/worktree create; verify current tree is already PR head.\n";
    } else {
        p += "use_worktree=false: only switch if already safe; prefer worktree if another PR may be active.\n";
    }
    if use_worktree && !skip_checkout {
        p += "RED→GREEN: one focused test per finding titled `P?: <subject>`; run FAIL then PASS inside WORKTREE_PATH. No monorepo test suite.\n";
    } else {
        p += "RED→GREEN: one focused test per finding titled `P?: <subject>`; run FAIL then PASS inside ACTIVE_CHECKOUT (cwd / current tree; WORKTREE_PATH may be unset). No monorepo test suite.\n";
    }
    p += "Commit: only files_changed+test_file (+ `.gitignore` only if tmp patterns were added). Never git add tmp* / *tmp* / .tmp*. msg `fix: address PR #N review`. ";
    if do_push {
        if use_worktree && !skip_checkout {
            p += "git push from WORKTREE_PATH only (-u origin HEAD:head_ref). ";
        } else {
            p += "git push from ACTIVE_CHECKOUT (cwd / current tree; WORKTREE_PATH may be unset) (-u origin HEAD:head_ref). ";
        }
    } else {
        p += "no push (push:false). ";
    }
    if do_reply {
        p += "reply+resolve when shipping. ";
    } else {
        p += "no github replies or resolves (reply:false). Do not reply or resolve threads. ";
    }
    if update_pr_body {
        if do_push {
            p += "proof-table once at end (payload under LOG_DIR). ";
        } else {
            p += "proof-table only if reported tip is already contained by remote PR head (push:false); otherwise skip proof-table so PR body does not claim unpushed fixes. ";
        }
    } else {
        p += "skip proof-table. ";
    }
    p += "tool_trace short. Fixed body needs: Fixed on tip + What changed + Proof.\n";
    p += "results[] MUST include every MUST_FIX target (status fixed|skipped_already_fixed|blocked|failed).\n";
    p += "Write LOG_DIR\\last-agent.json (PR+repo-scoped; never overwrite another PR's last-agent.json)\n";

    // Context: prefer this group's URLs; optionally full paste (single-PR) or filtered snippets (multi).
    let ctx = "";
    if g != () && g.urls != () {
        for u in g.urls {
            ctx += u.to_string() + "\n";
        }
        ctx += "---\n";
    }
    let paste_marker = if paste == "" { "" } else { paste.sub_string(0, if paste.len() < 40 { paste.len() } else { 40 }) };
    if include_full_paste {
        for t in texts {
            let s = t.to_string();
            if paste != "" && (s == paste || (paste_marker != "" && s.len() >= paste_marker.len() && s.sub_string(0, paste_marker.len()) == paste_marker && is_paste(s))) {
                continue;
            }
            if s.len() > 8000 { s = s.sub_string(0, 8000); }
            ctx += s + "\n---\n";
        }
        if paste != "" {
            if paste_marker == "" || !ctx.contains(paste_marker) {
                ctx += paste;
            } else if !ctx.contains(paste) {
                ctx += "\n---\n" + paste;
            }
        }
    } else {
        // Multi-PR: only snippets that mention this PR number or this group's URLs — avoid cross-PR confusion.
        let pr_token = "/pull/" + pr_s;
        for t in texts {
            let s = t.to_string();
            let sl = s.to_lower();
            let relevant = false;
            if pr_s != "" && sl.contains(pr_token) { relevant = true; }
            if g != () && g.urls != () {
                for u in g.urls {
                    if s.contains(u.to_string()) || sl.contains(u.to_string().to_lower()) { relevant = true; }
                }
            }
            for id in d_ids {
                if sl.contains("discussion_r" + id) { relevant = true; }
            }
            for id in i_ids {
                if sl.contains("issuecomment-" + id) { relevant = true; }
            }
            if !relevant { continue; }
            if s.len() > 6000 { s = s.sub_string(0, 6000); }
            ctx += s + "\n---\n";
        }
    }
    p += "\nINPUT (this PR only):\n" + ctx + "\nReturn run_schema JSON now.\n";
    p
}

fn build_wide_prompt(g, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, include_full_paste) {
    let pr_s = if g != () && g.pr != () { g.pr.to_string() } else { "" };
    let owner = if g != () { g.owner } else { "_detect" };
    let repo = if g != () { g.repo } else { "_detect" };
    let pr_url = pr_url_for_group(g);
    let d_ids = if g != () && g.d_ids != () { g.d_ids } else { [] };
    let i_ids = if g != () && g.i_ids != () { g.i_ids } else { [] };

    let p = "";
    p += "Unscoped PR review fix ALL for THIS PR only. Stay lean but do not silently drop unresolved threads.\n";
    if pr_url != "" {
        p += "PR_URL=" + pr_url + "\n";
        p += "Use PR_URL as the <PR> argument to every xbp github pr command.\n";
    }
    p += build_isolation_preamble(if pr_s != "" { pr_s } else { () }, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push);
    p += "xbp is fast — use view + discussions --unresolved --slim --detect-fixed-reply --our-author LOGIN (no tmp inventory dumps in repo).\n";
    if pr_s != "" { p += "PR=" + pr_s + "\n"; }
    if max_comments_explicit {
        p += "Fix ALL unresolved (soft max " + max_comments.to_string() + " — caller set max_comments). P1 first. RED→GREEN each. One commit.\n";
    } else {
        p += "Fix ALL unresolved (UNCAPPED default; no silent cap unless max_comments is set — do not stop at 80). P1 first. RED→GREEN each. One commit.\n";
    }
    if do_push {
        if use_worktree && !skip_checkout {
            p += "git push from WORKTREE_PATH only (-u origin HEAD:head_ref). ";
        } else {
            p += "git push from ACTIVE_CHECKOUT (cwd / current tree; WORKTREE_PATH may be unset) (-u origin HEAD:head_ref). ";
        }
    } else {
        p += "NO PUSH (push:false). Isolation step 6 is no-push; do not git push despite any other wording. ";
    }
    if do_reply {
        p += "reply+resolve each finding. ";
    } else {
        p += "no github replies (reply:false). Do not reply or resolve threads. ";
    }
    if update_pr_body {
        if do_push {
            p += "proof-table once at end (payload under LOG_DIR).\n";
        } else {
            p += "proof-table only if reported tip is already contained by remote PR head (push:false); otherwise skip proof-table.\n";
        }
    } else {
        p += "skip proof-table (update_pr_body:false). Do not update the PR body.\n";
    }
    p += "If INPUT has discussion_r or issuecomment ids for THIS PR, those are MUST_FIX in addition to unresolved inventory.\n";
    p += "discussion_r_ids=" + d_ids.to_string() + " issuecomment_ids=" + i_ids.to_string() + "\n";
    p += "TMP: prefer zero tmp* /.tmp* worktree files; if any basename is tmp* or .tmp*, append **/<basename> to .gitignore (+ prefix catch-all **/tmp* **/.tmp* only — never **/*tmp*). Never commit tmp files.\n";
    if do_reply {
        p += "Reply with -m or --body-file - when replies are enabled. ";
    }
    if update_pr_body {
        p += "proof-table --input under LOG_DIR when enabled.\n";
    } else {
        p += "\n";
    }
    p += "No monorepo suite. tool_trace. Return run_schema with worktree_path + log_dir.\n";

    let paste_marker_w = if paste == "" { "" } else { paste.sub_string(0, if paste.len() < 40 { paste.len() } else { 40 }) };
    if include_full_paste {
        for t in texts {
            let s = t.to_string();
            if paste != "" && (s == paste || (paste_marker_w != "" && s.len() >= paste_marker_w.len() && s.sub_string(0, paste_marker_w.len()) == paste_marker_w && is_paste(s))) {
                continue;
            }
            if s.len() > 4000 { s = s.sub_string(0, 4000); }
            p += s + "\n";
        }
        if paste != "" {
            if paste_marker_w == "" || !p.contains(paste_marker_w) {
                p += paste;
            } else if !p.contains(paste) {
                p += "\n---\n" + paste;
            }
        }
    } else {
        let pr_token = "/pull/" + pr_s;
        for t in texts {
            let s = t.to_string();
            let sl = s.to_lower();
            let relevant = false;
            if pr_s != "" && sl.contains(pr_token) { relevant = true; }
            if g != () && g.urls != () {
                for u in g.urls {
                    if sl.contains(u.to_string().to_lower()) { relevant = true; }
                }
            }
            if !relevant { continue; }
            if s.len() > 4000 { s = s.sub_string(0, 4000); }
            p += s + "\n";
        }
    }
    p
}

fn report_from_output(out, mode_label, d_count, i_count, totals) {
    let nres = 0;
    if out != () && out.results != () { nres = out.results.len(); }
    let report = "# fix-pr-comments-xbp-v2\n\n";
    report += "- **mode:** `" + mode_label + "`\n";
    report += "- **PR:** #" + (if out != () && out.pr_number != () { out.pr_number.to_string() } else { "?" }) + "\n";
    report += "- **repo:** `" + (if out != () && out.repo != () { out.repo } else { "" }) + "`\n";
    report += "- **tip:** `" + (if out != () && out.short_sha != () { out.short_sha } else { "" }) + "`\n";
    report += "- **targets:** discussion_r=" + d_count.to_string() + " issuecomment=" + i_count.to_string() + "\n";
    report += "- **worktree:** `" + (if out != () && out.worktree_path != () { out.worktree_path } else { "" }) + "`\n";
    report += "- **log_dir:** `" + (if out != () && out.log_dir != () { out.log_dir } else { "" }) + "`\n";
    report += "- **ship:** C=" + (if out != () && out.committed == true { "Y" } else { "N" })
        + " P=" + (if out != () && out.pushed == true { "Y" } else { "N" })
        + " R=" + (if out != () && out.replied == true { "Y" } else { "N" }) + "\n";
    report += "- **results:** " + nres.to_string() + "\n";
    report += "- **notes:** " + (if out != () && out.notes != () { out.notes } else { "" }) + "\n";
    if totals != () {
        report += "- **telemetry_ms:** " + totals.total_duration_ms.to_string() + " tokens=" + totals.total_tokens.to_string() + "\n\n";
    } else {
        report += "\n";
    }
    report += "| id | status | test |\n|---|---|---|\n";
    if out != () && out.results != () {
        for row in out.results {
            if row == () { continue; }
            report += "| " + (if row.comment_id != () { row.comment_id } else { "" });
            report += " | " + (if row.status != () { row.status } else { "" });
            report += " | " + (if row.test_title != () { row.test_title } else { "" }) + " |\n";
        }
    }
    if out != () && out.tool_trace != () {
        report += "\n## tool_trace\n```json\n" + json_encode(out.tool_trace) + "\n```\n";
    }
    report
}

// --- args ---
let pr_arg = if args == () { () } else { args.pr };
let repo_arg = ();
if args != () && args.repo != () { repo_arg = args.repo.to_string(); }
// Uncapped by default (fix ALL). Explicit max_comments still caps when set.
let max_comments_explicit = false;
let max_comments = (); // () = uncapped
if args != () && args.max_comments != () {
    max_comments = args.max_comments;
    max_comments_explicit = true;
}
let do_push = true;
if args != () && args.push == false { do_push = false; }
let do_reply = true;
if args != () && args.reply == false { do_reply = false; }
let dry_run = false;
if args != () && args.dry_run == true { dry_run = true; }
let skip_checkout = false;
if args != () && args.skip_checkout == true { skip_checkout = true; }
// Concurrent isolation: default ON. Each PR gets its own git worktree + log dir.
let use_worktree = true;
if args != () && args.use_worktree == false { use_worktree = false; }
if args != () && args.isolate == false { use_worktree = false; }
let worktree_path_arg = ();
if args != () && args.worktree_path != () { worktree_path_arg = args.worktree_path.to_string(); }
let update_pr_body = true;
if args != () && args.update_pr_body == false { update_pr_body = false; }
let force_wide = false;
if args != () && args.force_multi == true { force_wide = true; }
if args != () && args.force_wide == true { force_wide = true; }

let texts = collect_texts(args);
let d_ids = extract_ids(texts, "discussion_r");
let i_ids = extract_ids(texts, "issuecomment-");
if args != () && args.comment_ids != () {
    for cid in args.comment_ids {
        let cs = "" + cid;
        if cs.to_lower().contains("issuecomment") {
            for id in extract_ids([cs], "issuecomment-") {
                let seen = false;
                for e in i_ids { if e == id { seen = true; } }
                if !seen { i_ids.push(id); }
            }
        } else {
            let id = leading_digits(cs);
            if id != "" {
                let seen = false;
                for e in d_ids { if e == id { seen = true; } }
                if !seen { d_ids.push(id); }
            }
        }
    }
}
// FIX ALL: never drop issuecomments when discussion_r is also present (and vice versa).

let paste = if args != () && args.paste != () { args.paste.to_string() } else { "" };
if paste == "" {
    for t in texts {
        if is_paste(t) && t.to_string().len() > paste.len() { paste = t.to_string(); }
    }
}
if pr_arg == () {
    let p = extract_pr(texts);
    if p != () { pr_arg = p; }
}

// Group by owner/repo#pr for multi-PR / multi-repo fan-out
let groups = extract_pr_groups(texts, pr_arg, repo_arg);
// If groups empty but we have global ids + pr, extract_pr_groups already handled pr_arg.
// If groups empty and unscoped with no pr — single agent detects.

let multi = groups.len() > 1;
log("GROUPS n=" + groups.len().to_string() + " multi=" + (if multi { "1" } else { "0" }));
for g in groups {
    log("  group " + g.key + " d=" + g.d_ids.len().to_string() + " i=" + g.i_ids.len().to_string());
}

// kind — mixed keeps both classes (global; per-group kind used in multi)
let kind = "unscoped";
if d_ids.len() > 0 && i_ids.len() > 0 { kind = "mixed"; }
else if d_ids.len() > 0 { kind = "discussion_r"; }
else if i_ids.len() > 0 { kind = "issuecomment"; }
else if is_paste(paste) { kind = "paste"; }

// When scoped, size max_comments from inventory so every extracted id fits.
let scoped_count = d_ids.len() + i_ids.len();
if max_comments == () {
    if scoped_count > 0 {
        max_comments = scoped_count;
        if i_ids.len() > 0 && max_comments < i_ids.len() * 8 {
            max_comments = i_ids.len() * 8;
        }
    }
} else {
    if scoped_count > max_comments { max_comments = scoped_count; }
    if i_ids.len() > 0 && max_comments < i_ids.len() * 8 {
        max_comments = i_ids.len() * 8;
    }
}

// results[] schema: only set maxItems when we have an inventory- or caller-derived cap.
{
    let props = run_schema.properties;
    let results_schema = props.results;
    if max_comments != () {
        results_schema.maxItems = max_comments;
        props.results = results_schema;
        let files_committed_schema = props.files_committed;
        if max_comments > 80 {
            files_committed_schema.maxItems = max_comments;
            props.files_committed = files_committed_schema;
        }
    }
    run_schema.properties = props;
}

let one_shot = !force_wide && !dry_run;
let max_label = if max_comments == () { "uncapped" } else { max_comments.to_string() };
log("AUTO kind=" + kind + " d=" + d_ids.len().to_string() + " i=" + i_ids.len().to_string()
    + " max=" + max_label + " one_shot=" + (if one_shot { "1" } else { "0" })
    + " multi=" + (if multi { "1" } else { "0" }));

let events = [];
events.push(#{ kind: "mark", message: "kind=" + kind + " d=" + d_ids.len().to_string()
    + " i=" + i_ids.len().to_string() + " groups=" + groups.len().to_string()
    + " one_shot=" + (if one_shot { "1" } else { "0" }) });

if dry_run {
    write_scratch_file("dry.json", json_encode(#{
        kind: kind, d_ids: d_ids, i_ids: i_ids, pr: pr_arg, max_comments: max_comments,
        use_worktree: use_worktree, worktree_path: worktree_path_arg, texts: texts,
        groups: groups, multi: multi,
    }));
    complete(#{
        summary: "dry_run kind=" + kind + " groups=" + groups.len().to_string()
            + " d=" + d_ids.len().to_string() + " i=" + i_ids.len().to_string()
            + (if multi { " MULTI" } else { "" }),
        path: "scratch/dry.json",
        groups: groups,
        multi: multi,
    });
}

// ========== MULTI-PR PARALLEL ONE-SHOT ==========
if one_shot && multi {
    phase("Go");
    log("MULTI parallel fan-out groups=" + groups.len().to_string());
    let jobs = [];
    for g in groups {
        // worktree_path_arg only applies when single-PR; multi always uses default per-group paths
        let wt = ();
        let gk = group_kind(g);
        // paste-only global with no ids on this group → unscoped for that PR
        if gk == "unscoped" && kind == "paste" && g.d_ids.len() == 0 && g.i_ids.len() == 0 {
            // keep unscoped (or paste if we want) — unscoped inventory for that PR is safer
        }
        let prompt = build_go_prompt(g, gk, max_comments, max_comments_explicit, paste, texts, use_worktree, wt, skip_checkout, do_push, do_reply, update_pr_body, false);
        jobs.push(#{
            prompt: prompt,
            label: label_for_group(g),
            capability_mode: "all",
            output_schema: run_schema,
        });
    }
    let results = parallel(jobs);
    let gi = 0;
    for r in results {
        let lab = if gi < groups.len() { label_for_group(groups[gi]) } else { "go-multi" };
        events.push(agent_ev(lab, r));
        gi += 1;
    }
    let group_meta = [];
    for g in groups {
        group_meta.push(#{ key: g.key, owner: g.owner, repo: g.repo, pr: g.pr, d: g.d_ids.len(), i: g.i_ids.len() });
    }
    let totals = flush("one_shot_multi_" + groups.len().to_string(), events, #{
        kind: kind, multi: true, groups: group_meta, d_ids: d_ids, i_ids: i_ids, max_comments: max_comments,
        use_worktree: use_worktree,
    });

    let report = "# fix-pr-comments-xbp-v2 (multi-PR parallel)\n\n";
    report += "- **groups:** " + groups.len().to_string() + "\n";
    report += "- **telemetry_ms:** " + totals.total_duration_ms.to_string() + " tokens=" + totals.total_tokens.to_string() + "\n";
    report += "- **agents_failed:** " + totals.failed.to_string() + "\n\n";

    let all_outputs = [];
    let nres_total = 0;
    let any_fail = false;
    let first_pr = ();
    let first_sha = ();
    let gi2 = 0;
    for r in results {
        let g = if gi2 < groups.len() { groups[gi2] } else { () };
        let gkey = if g != () { g.key } else { "?" };
        report += "## Group `" + gkey + "`\n\n";
        if r == () || !r.success || r.output == () {
            any_fail = true;
            report += "- **status:** FAILED\n\n";
            all_outputs.push(#{ key: gkey, success: false, output: () });
        } else {
            let out = r.output;
            if first_pr == () && out.pr_number != () { first_pr = out.pr_number; }
            if first_sha == () && out.sha != () { first_sha = out.sha; }
            let dc = if g != () { g.d_ids.len() } else { 0 };
            let ic = if g != () { g.i_ids.len() } else { 0 };
            report += report_from_output(out, "one_shot_multi/" + group_kind(g), dc, ic, ());
            report += "\n";
            if out.results != () { nres_total += out.results.len(); }
            all_outputs.push(#{ key: gkey, success: true, output: out });
        }
        gi2 += 1;
    }

    let path = write_scratch_file("fix-pr-comments-xbp-v2-report.md", report);
    write_scratch_file("fix-pr-comments-xbp-v2-proof-payload.json", json_encode(#{
        multi: true,
        groups: group_meta,
        runs: all_outputs,
    }));
    if any_fail {
        // Still complete with partial results so user sees which groups succeeded
        log("MULTI partial failure — see report");
    }
    complete(#{
        path: path,
        summary: "multi n_groups=" + groups.len().to_string() + " n_results=" + nres_total.to_string()
            + " failed=" + totals.failed.to_string() + " " + totals.total_duration_ms.to_string() + "ms",
        multi: true,
        groups: group_meta,
        pr: first_pr,
        sha: first_sha,
        telemetry: #{ path: "scratch/telemetry.json", totals: totals, mode: "one_shot_multi" },
        report: report,
    });
}

// ========== SINGLE-PR ONE-SHOT ==========
if one_shot {
    phase("Go");
    // Prefer structured group when we have exactly one; else synthetic from global ids
    let g = ();
    if groups.len() == 1 {
        g = groups[0];
    } else {
        let owner = if repo_arg != () {
            let rr = repo_arg.to_string();
            if rr.contains("/") {
                let sp = rr.split("/");
                if sp.len() >= 2 { sp[0] } else { "_detect" }
            } else { "_detect" }
        } else { "_detect" };
        let repo = if repo_arg != () {
            let rr = repo_arg.to_string();
            if rr.contains("/") {
                let sp = rr.split("/");
                if sp.len() >= 2 { sp[1] } else { "_detect" }
            } else { "_detect" }
        } else { "_detect" };
        let prs = if pr_arg != () { pr_arg.to_string() } else { "" };
        g = #{
            key: owner + "/" + repo + "#" + prs,
            owner: owner,
            repo: repo,
            pr: prs,
            d_ids: d_ids,
            i_ids: i_ids,
            urls: [],
        };
    }
    // Single-PR: include full paste context
    let prompt = build_go_prompt(g, kind, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, true);
    let r = agent(prompt, #{
        label: "go",
        capability_mode: "all",
        output_schema: run_schema,
    });
    events.push(agent_ev("go", r));
    let totals = flush("one_shot_" + kind, events, #{
        kind: kind, pr: pr_arg, d_ids: d_ids, i_ids: i_ids, max_comments: max_comments,
        use_worktree: use_worktree, multi: false,
        group: if g != () { g.key } else { "" },
    });

    if r == () || !r.success || r.output == () {
        pause("infra", "One-shot agent failed. scratch/telemetry.json");
    }
    let out = r.output;
    let nres = 0;
    if out.results != () { nres = out.results.len(); }
    let report = report_from_output(out, "one_shot / " + kind, d_ids.len(), i_ids.len(), totals);
    let path = write_scratch_file("fix-pr-comments-xbp-v2-report.md", report);
    write_scratch_file("fix-pr-comments-xbp-v2-proof-payload.json", json_encode(out));
    complete(#{
        path: path,
        summary: kind + " n=" + nres.to_string() + " d=" + d_ids.len().to_string() + " i=" + i_ids.len().to_string()
            + " " + (if out.short_sha != () { out.short_sha } else { "" })
            + " " + totals.total_duration_ms.to_string() + "ms",
        pr: out.pr_number,
        sha: out.sha,
        telemetry: #{ path: "scratch/telemetry.json", totals: totals, mode: "one_shot_" + kind },
        report: report,
    });
}

// ========== WIDE: full unscoped inventory — still fix ALL ==========
// Multi-PR wide: parallel one wide agent per group
phase("Wide");
if multi {
    log("WIDE multi parallel groups=" + groups.len().to_string());
    let jobs = [];
    for g in groups {
        let prompt = build_wide_prompt(g, max_comments, max_comments_explicit, paste, texts, use_worktree, (), skip_checkout, do_push, do_reply, update_pr_body, false);
        jobs.push(#{
            prompt: prompt,
            label: "wide-" + label_for_group(g),
            capability_mode: "all",
            output_schema: run_schema,
        });
    }
    let results = parallel(jobs);
    let gi = 0;
    for r in results {
        let lab = if gi < groups.len() { "wide-" + label_for_group(groups[gi]) } else { "wide-multi" };
        events.push(agent_ev(lab, r));
        gi += 1;
    }
    let totals = flush("wide_multi_" + groups.len().to_string(), events, #{ multi: true, d_ids: d_ids, i_ids: i_ids });
    let report = "# fix-pr-comments-xbp-v2 (wide multi)\n\n";
    report += "- **groups:** " + groups.len().to_string() + "\n";
    report += "- **ms:** " + totals.total_duration_ms.to_string() + "\n\n";
    let nres_total = 0;
    let first_pr = ();
    let first_sha = ();
    let gi2 = 0;
    for r in results {
        let g = if gi2 < groups.len() { groups[gi2] } else { () };
        let gkey = if g != () { g.key } else { "?" };
        report += "## Group `" + gkey + "`\n\n";
        if r != () && r.success && r.output != () {
            let out = r.output;
            if first_pr == () && out.pr_number != () { first_pr = out.pr_number; }
            if first_sha == () && out.sha != () { first_sha = out.sha; }
            if out.results != () { nres_total += out.results.len(); }
            report += report_from_output(out, "wide_multi", 0, 0, ());
            report += "\n";
        } else {
            report += "- **status:** FAILED\n\n";
        }
        gi2 += 1;
    }
    let path = write_scratch_file("fix-pr-comments-xbp-v2-report.md", report);
    write_scratch_file("fix-pr-comments-xbp-v2-proof-payload.json", json_encode(#{ multi: true, mode: "wide" }));
    complete(#{
        path: path,
        summary: "wide multi n_groups=" + groups.len().to_string() + " n=" + nres_total.to_string() + " " + totals.total_duration_ms.to_string() + "ms",
        multi: true,
        pr: first_pr,
        sha: first_sha,
        telemetry: #{ path: "scratch/telemetry.json", totals: totals, mode: "wide_multi" },
        report: report,
    });
}

log("WIDE path (force_wide single)");
let g_wide = ();
if groups.len() == 1 {
    g_wide = groups[0];
} else {
    let owner = "_detect";
    let repo = "_detect";
    if repo_arg != () {
        let rr = repo_arg.to_string();
        if rr.contains("/") {
            let sp = rr.split("/");
            if sp.len() >= 2 {
                owner = sp[0];
                repo = sp[1];
            }
        }
    }
    g_wide = #{
        key: owner + "/" + repo + "#" + (if pr_arg != () { pr_arg.to_string() } else { "" }),
        owner: owner,
        repo: repo,
        pr: if pr_arg != () { pr_arg.to_string() } else { "" },
        d_ids: d_ids,
        i_ids: i_ids,
        urls: [],
    };
}
let p = build_wide_prompt(g_wide, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, true);
let r = agent(p, #{ label: "wide", capability_mode: "all", output_schema: run_schema });
events.push(agent_ev("wide", r));
let totals = flush("wide", events, #{ d_ids: d_ids, i_ids: i_ids });
if r == () || !r.success || r.output == () {
    pause("infra", "Wide agent failed");
}
let out = r.output;
let nres = 0;
if out.results != () { nres = out.results.len(); }
let report = report_from_output(out, "wide", d_ids.len(), i_ids.len(), totals);
let path = write_scratch_file("fix-pr-comments-xbp-v2-report.md", report);
write_scratch_file("fix-pr-comments-xbp-v2-proof-payload.json", json_encode(out));
complete(#{
    path: path,
    summary: "wide n=" + nres.to_string() + " " + totals.total_duration_ms.to_string() + "ms",
    pr: out.pr_number,
    sha: out.sha,
    telemetry: #{ path: "scratch/telemetry.json", totals: totals, mode: "wide" },
    report: report,
});
