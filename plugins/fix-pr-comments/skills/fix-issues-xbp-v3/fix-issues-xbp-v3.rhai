// fix-issues-xbp-v3 — extends fix-issues-xbp-v3 for ISSUES + PR reviews/discussions
// Rule: if we can detect scope → ONE agent per target end-to-end. No bootstrap/fix/ship fan-out.
// Targets: GitHub issues (/issues/N), PR review threads (#discussion_r), PR/issue comments
// (#issuecomment-), PR reviews (#pullrequestreview-), bare PR URLs, review paste.
// MULTI-TARGET / MULTI-REPO: group by owner/repo#pr-N or owner/repo#issue-N. When 2+ groups,
// fan out parallel agents. Isolated git worktree + log dir under
// ~/.xbp/{worktrees,logs,repos}/<owner>-<repo>/{pr|issue}-<N>.
// EMPTY INVOCATION aborts (no agents). Opt-in: allow_unscoped=true / allow_empty=true.
// Avoid *tmp* worktree artifacts — prefer xbp -m / --body-file - / stdout.
// CLI-only xbp. Telemetry: scratch/telemetry.json + run.log + performance.md

let meta = #{
    name: "fix-issues-xbp-v3",
    description: "CLI-only fix for GitHub issues + PR reviews. v3.1: slim schema, short prompts, max_concurrency batches (default 4), shared cargo target hint, hard explore caps. One agent per group still, but cheaper.",
    when_to_use: "Fix one or many GitHub issue URLs and/or PR discussion/review/issuecomment URLs in one run. Mixed issues+PRs+repos fan out in bounded parallel batches.",
    phases: [
        #{ title: "Go", detail: "one agent per issue/PR: isolate→fix→ship (batched parallel when multi)" },
        #{ title: "Wide", detail: "unscoped full inventory per PR (batched parallel when multi)" },
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

fn extract_issue(texts) {
    if texts == () { return (); }
    for t in texts {
        if t == () { continue; }
        let lower = t.to_string().to_lower();
        let parts = lower.split("/issues/");
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

fn parse_owner_repo_number(path, marker) {
    if path == () || marker == () { return (); }
    let lower = path.to_string().to_lower();
    let m = marker.to_string().to_lower();
    if !lower.contains(m) { return (); }
    let parts = lower.split(m);
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
    let num = leading_digits(parts[1]);
    if owner == "" || repo == "" || num == "" { return (); }
    if owner.contains(":") { return (); }
    #{ owner: owner, repo: repo, number: num }
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
    if args.issue_urls != () { for u in args.issue_urls { bag = push_u(bag, u); } }
    if args.issues != () { for u in args.issues { bag = push_u(bag, u); } }
    if args.issue != () { bag = push_u(bag, args.issue); }
    if args.reviews != () { for u in args.reviews { bag = push_u(bag, u); } }
    if args.review_urls != () { for u in args.review_urls { bag = push_u(bag, u); } }
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
    let r = parse_owner_repo_number(path, "/pull/");
    if r == () { return (); }
    #{ owner: r.owner, repo: r.repo, pr: r.number }
}

fn parse_owner_repo_issue(path) {
    let r = parse_owner_repo_number(path, "/issues/");
    if r == () { return (); }
    #{ owner: r.owner, repo: r.repo, issue: r.number }
}

fn repo_slug(owner, repo) {
    let o = if owner != () { owner.to_string() } else { "_detect" };
    let r = if repo != () { repo.to_string() } else { "_detect" };
    // Windows-safe: no slashes
    o + "-" + r
}

// target_type: "pr" | "issue". number is PR or issue number. r_add = pullrequestreview ids.
fn upsert_group(groups, target_type, owner, repo, number, d_add, i_add, r_add, url) {
    let tt = if target_type != () { target_type.to_string() } else { "pr" };
    let num = number.to_string();
    let key = owner.to_string() + "/" + repo.to_string() + "#" + tt + "-" + num;
    let out = [];
    let found = false;
    for g in groups {
        if g.key == key {
            found = true;
            let d = g.d_ids;
            if d_add != () { for id in d_add { d = push_u(d, id); } }
            let ids_i = g.i_ids;
            if i_add != () { for id in i_add { ids_i = push_u(ids_i, id); } }
            let ids_r = if g.review_ids != () { g.review_ids } else { [] };
            if r_add != () { for id in r_add { ids_r = push_u(ids_r, id); } }
            let urls = g.urls;
            if url != () { urls = push_u(urls, url); }
            out.push(#{
                key: key,
                target_type: tt,
                owner: owner.to_string(),
                repo: repo.to_string(),
                number: num,
                pr: if tt == "pr" { num } else { "" },
                issue: if tt == "issue" { num } else { "" },
                d_ids: d,
                i_ids: ids_i,
                review_ids: ids_r,
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
        let ids_r = [];
        if r_add != () { for id in r_add { ids_r = push_u(ids_r, id); } }
        let urls = [];
        if url != () { urls = push_u(urls, url); }
        out.push(#{
            key: key,
            target_type: tt,
            owner: owner.to_string(),
            repo: repo.to_string(),
            number: num,
            pr: if tt == "pr" { num } else { "" },
            issue: if tt == "issue" { num } else { "" },
            d_ids: d,
            i_ids: ids_i,
            review_ids: ids_r,
            urls: urls,
        });
    }
    out
}

// Group every github.com/.../pull/N and .../issues/N URL by owner/repo#{pr|issue}-N.
// Also extracts discussion_r, issuecomment, pullrequestreview ids from URL fragments.
// Bare discussion_r / issuecomment / review ids without a URL attach to the only group,
// or to pr_arg / issue_arg / first group when multi.
fn extract_pr_groups(texts, pr_arg, repo_arg) {
    // Back-compat wrapper: no issue_arg
    extract_all_groups(texts, pr_arg, (), repo_arg)
}

fn extract_all_groups(texts, pr_arg, issue_arg, repo_arg) {
    let groups = [];
    if texts == () { texts = []; }

    for t in texts {
        if t == () { continue; }
        let lower = t.to_string().to_lower();
        let parts = lower.split("github.com/");
        let pi = 0;
        for p in parts {
            if pi == 0 { pi += 1; continue; }
            pi += 1;
            let chunk = take_url_chunk(p);
            let full_url = "https://github.com/" + chunk;
            // Prefer pull when both appear (rare); check pull first then issues
            let pref = parse_owner_repo_pr(chunk);
            if pref != () {
                let d = extract_ids([chunk], "discussion_r");
                let i = extract_ids([chunk], "issuecomment-");
                let r = extract_ids([chunk], "pullrequestreview-");
                groups = upsert_group(groups, "pr", pref.owner, pref.repo, pref.pr, d, i, r, full_url);
                continue;
            }
            let iref = parse_owner_repo_issue(chunk);
            if iref != () {
                // Issue URLs can carry #issuecomment- fragments
                let i = extract_ids([chunk], "issuecomment-");
                groups = upsert_group(groups, "issue", iref.owner, iref.repo, iref.issue, [], i, [], full_url);
            }
        }
    }

    // Orphan bare ids
    let all_d = extract_ids(texts, "discussion_r");
    let all_i = extract_ids(texts, "issuecomment-");
    let all_r = extract_ids(texts, "pullrequestreview-");
    let assigned_d = [];
    let assigned_i = [];
    let assigned_r = [];
    for g in groups {
        for id in g.d_ids { assigned_d = push_u(assigned_d, id); }
        for id in g.i_ids { assigned_i = push_u(assigned_i, id); }
        if g.review_ids != () {
            for id in g.review_ids { assigned_r = push_u(assigned_r, id); }
        }
    }
    let orphan_d = [];
    let orphan_i = [];
    let orphan_r = [];
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
    for id in all_r {
        let seen = false;
        for e in assigned_r { if e == id { seen = true; } }
        if !seen { orphan_r.push(id); }
    }

    if orphan_d.len() > 0 || orphan_i.len() > 0 || orphan_r.len() > 0 {
        if groups.len() == 1 {
            let g0 = groups[0];
            let tt = if g0.target_type != () { g0.target_type } else { "pr" };
            let num = if g0.number != () { g0.number } else { g0.pr };
            groups = upsert_group(groups, tt, g0.owner, g0.repo, num, orphan_d, orphan_i, orphan_r, ());
        } else if groups.len() == 0 {
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
            if pr_arg != () {
                groups = upsert_group(groups, "pr", owner, repo, pr_arg.to_string(), orphan_d, orphan_i, orphan_r, ());
            } else if issue_arg != () {
                groups = upsert_group(groups, "issue", owner, repo, issue_arg.to_string(), orphan_d, orphan_i, orphan_r, ());
            }
        } else {
            let placed = false;
            if pr_arg != () {
                let want = pr_arg.to_string();
                for g in groups {
                    let tt = if g.target_type != () { g.target_type } else { "pr" };
                    let num = if g.number != () { g.number } else { g.pr };
                    if tt == "pr" && num == want {
                        groups = upsert_group(groups, "pr", g.owner, g.repo, num, orphan_d, orphan_i, orphan_r, ());
                        placed = true;
                        break;
                    }
                }
            }
            if !placed && issue_arg != () {
                let want = issue_arg.to_string();
                for g in groups {
                    let tt = if g.target_type != () { g.target_type } else { "pr" };
                    let num = if g.number != () { g.number } else { if g.issue != () { g.issue } else { "" } };
                    if tt == "issue" && num == want {
                        groups = upsert_group(groups, "issue", g.owner, g.repo, num, orphan_d, orphan_i, orphan_r, ());
                        placed = true;
                        break;
                    }
                }
            }
            if !placed {
                let pick = groups[0];
                for g in groups {
                    let tt = if g.target_type != () { g.target_type } else { "pr" };
                    if tt == "pr" { pick = g; break; }
                }
                let tt = if pick.target_type != () { pick.target_type } else { "pr" };
                let num = if pick.number != () { pick.number } else { pick.pr };
                groups = upsert_group(groups, tt, pick.owner, pick.repo, num, orphan_d, orphan_i, orphan_r, ());
            }
        }
    }

    // pr_arg-only unscoped
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
        groups = upsert_group(groups, "pr", owner, repo, pr_arg.to_string(), [], [], [], ());
    }

    // issue_arg-only
    if groups.len() == 0 && issue_arg != () {
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
        groups = upsert_group(groups, "issue", owner, repo, issue_arg.to_string(), [], [], [], ());
    }

    groups
}

fn group_kind(g) {
    if g == () { return "unscoped"; }
    let tt = if g.target_type != () { g.target_type.to_string() } else { "pr" };
    if tt == "issue" {
        let ni = if g.i_ids != () { g.i_ids.len() } else { 0 };
        if ni > 0 { return "issue_with_comments"; }
        return "issue";
    }
    let nd = if g.d_ids != () { g.d_ids.len() } else { 0 };
    let ni = if g.i_ids != () { g.i_ids.len() } else { 0 };
    let nr = if g.review_ids != () { g.review_ids.len() } else { 0 };
    if nd > 0 && ni > 0 { return "mixed"; }
    if nd > 0 && nr > 0 { return "mixed"; }
    if ni > 0 && nr > 0 { return "mixed"; }
    if nd > 0 { return "discussion_r"; }
    if ni > 0 { return "issuecomment"; }
    if nr > 0 { return "review"; }
    "unscoped"
}

fn pr_url_for_group(g) {
    if g == () { return ""; }
    if g.urls != () && g.urls.len() > 0 {
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
    let num = if g.number != () && g.number != "" { g.number.to_string() } else if g.pr != () { g.pr.to_string() } else { "" };
    if g.owner != () && g.repo != () && num != "" && g.owner != "_detect" {
        return "https://github.com/" + g.owner + "/" + g.repo + "/pull/" + num;
    }
    if num != "" { return num; }
    ""
}

fn issue_url_for_group(g) {
    if g == () { return ""; }
    if g.urls != () && g.urls.len() > 0 {
        let u = g.urls[0].to_string();
        let lower = u.to_lower();
        if lower.contains("/issues/") {
            let parts = lower.split("/issues/");
            if parts.len() >= 2 {
                let n = leading_digits(parts[1]);
                if n != "" && g.owner != () && g.repo != () && g.owner != "_detect" {
                    return "https://github.com/" + g.owner + "/" + g.repo + "/issues/" + n;
                }
            }
        }
    }
    let num = if g.number != () && g.number != "" { g.number.to_string() } else if g.issue != () { g.issue.to_string() } else { "" };
    if g.owner != () && g.repo != () && num != "" && g.owner != "_detect" {
        return "https://github.com/" + g.owner + "/" + g.repo + "/issues/" + num;
    }
    if num != "" { return num; }
    ""
}

fn label_for_group(g) {
    if g == () { return "go"; }
    let slug = repo_slug(g.owner, g.repo);
    let tt = if g.target_type != () { g.target_type.to_string() } else { "pr" };
    let num = if g.number != () && g.number != "" { g.number.to_string() } else if tt == "issue" && g.issue != () { g.issue.to_string() } else { g.pr.to_string() };
    "go-" + slug + "-" + tt + num
}

// Concurrent multi-PR / multi-repo isolation preamble.
// owner/repo may be "_detect" when unknown — agent resolves via xbp/gh.
fn build_isolation_preamble(target_type, number_arg, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push) {
    // v3.1: compact isolation — paths + 5 steps (was ~80 lines / agent).
    let tt = if target_type != () { target_type.to_string() } else { "pr" };
    let kind_path = if tt == "issue" { "issue" } else { "pr" };
    let slug = repo_slug(owner, repo);
    let num = if number_arg != () { number_arg.to_string() } else { "<N>" };
    let p = "";
    p += "\n=== ISOLATION (mandatory) ===\n";
    p += "Never switch PRIMARY workspace branch / gh pr checkout / stash-reset PRIMARY.\n";
    p += "TARGET=" + tt + " NUMBER=" + num + "\n";
    if owner != () && owner != "_detect" {
        p += "REPO=" + owner.to_string() + "/" + repo.to_string() + " SLUG=" + slug + "\n";
    } else {
        p += "REPO=detect SLUG=<owner>-<repo>\n";
    }
    p += "LOG_DIR=%USERPROFILE%\\.xbp\\logs\\fix-issues-xbp-v3\\" + slug + "\\" + kind_path + "-" + num + "\n";
    p += "CARGO_TARGET_DIR=%USERPROFILE%\\.xbp\\cache\\cargo-target\\" + slug + "  (set env for ALL cargo; share across worktrees)\n";
    p += "mkdir LOG_DIR; write last-agent.json only under LOG_DIR. Prefer xbp -m / --body-file -; no repo tmp*.\n";
    if use_worktree && !skip_checkout {
        if worktree_path_arg != () {
            p += "WORKTREE=" + worktree_path_arg.to_string() + "\n";
        } else {
            p += "WORKTREE=%USERPROFILE%\\.xbp\\worktrees\\" + slug + "\\" + kind_path + "-" + num + "\n";
        }
        p += "MIRROR=%USERPROFILE%\\.xbp\\repos\\" + slug + " (use if not primary repo)\n";
        if tt == "pr" {
            p += "1) xbp github pr view PR_URL --json --slim → head_ref/sha\n";
            p += "2) Reuse WORKTREE if clean+HEAD matches head_sha else worktree add at head\n";
            p += "3) Edit/test/commit ONLY in WORKTREE\n";
            if do_push {
                p += "4) git -C WORKTREE push -u origin HEAD:head_ref\n";
            } else {
                p += "4) NO PUSH\n";
            }
            p += "5) Keep worktree; return worktree_path+log_dir\n";
        } else {
            p += "1) default branch via gh repo view; branch fix/issue-" + num + "-slug from origin/default\n";
            p += "2) Reuse/create WORKTREE (never PRIMARY)\n";
            p += "3) Edit/test/commit ONLY in WORKTREE\n";
            if do_push {
                p += "4) push; gh pr create with Fixes #" + num + " if none\n";
            } else {
                p += "4) NO PUSH\n";
            }
            p += "5) Keep worktree; return worktree_path+log_dir+pr_created_url\n";
        }
    } else if skip_checkout {
        p += "USE_WORKTREE=false (skip_checkout) — tree must already match target.\n";
    } else {
        p += "USE_WORKTREE=false — do not clobber unrelated branches.\n";
    }
    p += "=== end ISOLATION ===\n";
    p
}

fn lean_rules() {
    // Shared cost caps — keep agents off monorepo rabbit holes.
    let p = "";
    p += "\n=== LEAN (v3.1 hard caps) ===\n";
    p += "MAX_SEARCH=8 (grep/glob/read for discovery). After that: implement or status=blocked.\n";
    p += "No monorepo suite: never cargo test --workspace / cargo test --locked without -p; never full pnpm test.\n";
    p += "Prefer: cargo test -p <crate> --lib --locked <filter>  (set CARGO_TARGET_DIR first).\n";
    p += "Skip agent work if PR already open with Fixes #N and same tip — comment link only.\n";
    p += "tool_trace optional (≤12 short cmds). Omit original_case_summary.\n";
    p += "=== end LEAN ===\n";
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
        workflow: "fix-issues-xbp-v3",
        schema_version: 4,
        mode: mode,
        events: events,
        totals: totals,
        meta: if meta_map != () { meta_map } else { #{} },
    }));
    let logl = "fix-issues-xbp-v3\n";
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

// Slim schema (v3.1) — fewer required fields → fewer schema-repair loops / shorter finals.
// tool_trace is OPTIONAL (was a silent token tax when required + max 80).
let run_schema = #{
    "type": "object",
    "required": ["target_type", "repo", "sha", "committed", "pushed", "results"],
    "properties": #{
        "target_type": #{ "type": "string" },
        "pr_number": #{ "type": "integer" },
        "issue_number": #{ "type": "integer" },
        "pr_created_url": #{ "type": "string" },
        "closed_issue": #{ "type": "boolean" },
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
            "maxItems": 12,
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
                "required": ["comment_id", "status", "test_file"],
                "properties": #{
                    "comment_id": #{ "type": "string" },
                    "status": #{ "type": "string" },
                    "subject": #{ "type": "string" },
                    "priority": #{ "type": "string" },
                    "test_title": #{ "type": "string" },
                    "test_file": #{ "type": "string" },
                    "files_changed": #{ "type": "array", "maxItems": 20, "items": #{ "type": "string" } },
                    "red_ran": #{ "type": "boolean" },
                    "red_failed_as_expected": #{ "type": "boolean" },
                    "green_ran": #{ "type": "boolean" },
                    "green_passed": #{ "type": "boolean" },
                    "red_command": #{ "type": "string" },
                    "green_command": #{ "type": "string" },
                    "notes": #{ "type": "string" },
                },
            },
        },
        "files_committed": #{ "type": "array", "maxItems": 40, "items": #{ "type": "string" } },
    },
};

// Build the full go-agent prompt for one PR group (single or parallel fan-out member).
fn build_go_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, include_full_paste) {
    let d_ids = if g != () && g.d_ids != () { g.d_ids } else { [] };
    let i_ids = if g != () && g.i_ids != () { g.i_ids } else { [] };
    let r_ids = if g != () && g.review_ids != () { g.review_ids } else { [] };
    let kind = if kind_override != () { kind_override } else { group_kind(g) };
    let pr_s = if g != () && g.pr != () && g.pr.to_string() != "" { g.pr.to_string() } else if g != () && g.number != () { g.number.to_string() } else { "" };
    let owner = if g != () { g.owner } else { "_detect" };
    let repo = if g != () { g.repo } else { "_detect" };
    let pr_url = pr_url_for_group(g);

    let p = "";
    p += "FAST FIX PR. Fix EVERY listed discussion_r + issuecomment + pullrequestreview for THIS PR only. Never drop a class.\n";
    p += "xbp only (no MCP). LOGIN=`gh api user -q .login`\n";
    if pr_url != "" {
        p += "PR_URL=" + pr_url + "\n";
    }
    p += build_isolation_preamble("pr", if pr_s != "" { pr_s } else { () }, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push);
    p += lean_rules();
    p += "CLI: xbp github pr view|discussions|reply|resolve|comment|proof-table PR_URL (slim/json; reply --if-not-fixed).\n";
    p += "issuecomment body: gh api repos/O/R/issues/comments/ID --jq .body\n";
    p += "TMP: no worktree tmp*; use -m/--body-file -; if tmp* created gitignore **/name + **/tmp* **/.tmp* only.\n";
    if pr_s != "" { p += "PR=" + pr_s + "\n"; }
    p += "KIND=" + kind + " MAX=" + (if max_comments == () { "uncapped" } else { max_comments.to_string() }) + " (soft ceiling only when set; never skip listed targets)\n";
    p += "discussion_r_ids=" + d_ids.to_string() + "\n";
    p += "issuecomment_ids=" + i_ids.to_string() + "\n";
    p += "pullrequestreview_ids=" + r_ids.to_string() + "\n";

    if kind == "mixed" || (d_ids.len() > 0 && i_ids.len() > 0) || (d_ids.len() > 0 && r_ids.len() > 0) || (i_ids.len() > 0 && r_ids.len() > 0) {
        p += "SCOPE=ALL provided targets for THIS PR (mixed discussion_r + issuecomment + pullrequestreview). Fix all classes in one run.\n";
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
        p += "=== pullrequestreview bodies — ALL of these ===\n";
        for id in r_ids {
            p += "MUST_FIX pullrequestreview-" + id + "\n";
        }
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
    } else if kind == "review" {
        p += "SCOPE=ALL listed pullrequestreview ids for THIS PR. Fetch each review body via xbp github pr reviews / gh api.\n";
        for id in r_ids {
            p += "MUST_FIX pullrequestreview-" + id + "\n";
        }
        p += "Parse EVERY actionable P0-P3 / bullet finding in each review. Prefer mapping to discussion threads when present; else ids=review-ID-N.\n";
        p += "RED→GREEN each. ONE commit. Reply on threads when discussion_r known; else top-level pr comment summarizing review fixes.\n";
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
    p += "Fixed reply body: Fixed on tip + What changed + Proof (red/green cmds). No long essays.\n";
    p += "results[] every MUST_FIX (fixed|skipped_already_fixed|blocked|failed). Write LOG_DIR\\last-agent.json\n";

    // Context: prefer this group's URLs; optionally full paste (single-PR) or filtered snippets (multi).
    // v3.1: tighter caps (4k single / 3k multi) to cut prompt tokens.
    let ctx = "";
    if g != () && g.urls != () {
        for u in g.urls {
            ctx += u.to_string() + "\n";
        }
        ctx += "---\n";
    }
    let paste_marker = if paste == "" { "" } else { paste.sub_string(0, if paste.len() < 40 { paste.len() } else { 40 }) };
    let cap_full = 4000;
    let cap_multi = 3000;
    if include_full_paste {
        for t in texts {
            let s = t.to_string();
            if paste != "" && (s == paste || (paste_marker != "" && s.len() >= paste_marker.len() && s.sub_string(0, paste_marker.len()) == paste_marker && is_paste(s))) {
                continue;
            }
            if s.len() > cap_full { s = s.sub_string(0, cap_full); }
            ctx += s + "\n---\n";
        }
        if paste != "" {
            let paste_use = paste;
            if paste_use.len() > cap_full { paste_use = paste_use.sub_string(0, cap_full); }
            if paste_marker == "" || !ctx.contains(paste_marker) {
                ctx += paste_use;
            } else if !ctx.contains(paste) {
                ctx += "\n---\n" + paste_use;
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
            if s.len() > cap_multi { s = s.sub_string(0, cap_multi); }
            ctx += s + "\n---\n";
        }
    }
    p += "\nINPUT (this PR only):\n" + ctx + "\nReturn slim run_schema JSON now.\n";
    p
}

// Issue end-to-end fix prompt (body + comments → branch → red→green → PR + issue comment).
fn build_issue_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, close_issue, include_full_paste) {
    let i_ids = if g != () && g.i_ids != () { g.i_ids } else { [] };
    let kind = if kind_override != () { kind_override } else { group_kind(g) };
    let num_s = if g != () && g.number != () && g.number != "" { g.number.to_string() } else if g != () && g.issue != () { g.issue.to_string() } else { "" };
    let owner = if g != () { g.owner } else { "_detect" };
    let repo = if g != () { g.repo } else { "_detect" };
    let issue_url = issue_url_for_group(g);

    let p = "";
    p += "FAST FIX ISSUE. Implement THIS issue only. xbp+gh only (no MCP).\n";
    if issue_url != "" { p += "ISSUE_URL=" + issue_url + "\n"; }
    if num_s != "" { p += "ISSUE_NUMBER=" + num_s + "\n"; }
    p += build_isolation_preamble("issue", if num_s != "" { num_s } else { () }, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push);
    p += lean_rules();
    if owner != () && owner != "_detect" {
        p += "Fetch once: gh issue view " + num_s + " --repo " + owner + "/" + repo + " --json title,body,labels,state\n";
        p += "xbp github comments " + num_s + " --owner " + owner + " --repo " + repo + " (only if needed)\n";
    } else {
        p += "Fetch once: gh issue view N --json title,body,labels,state\n";
    }
    p += "KIND=" + kind + " MAX=" + (if max_comments == () { "uncapped" } else { max_comments.to_string() }) + "\n";
    p += "issuecomment_ids=" + i_ids.to_string() + "\n";
    p += "SCOPE=body acceptance criteria + checklists + bug repros + EVERY P0-P3. ids: issue-N-body-K / issuecomment-ICID-K\n";
    for id in i_ids {
        p += "MUST_FIX issuecomment-" + id + "\n";
    }
    p += "MUST_FIX issue body for #" + num_s + "\n";
    p += "Per finding: focused test FIRST (RED) → implement → GREEN. ONE allowlist commit: `fix: address issue #" + num_s + "`\n";
    if do_push {
        p += "Push; gh pr create with Fixes #" + num_s + " + short proof (cmds+SHA). Skip create if open PR already Fixes #" + num_s + ".\n";
    } else {
        p += "NO PUSH (push:false).\n";
    }
    if do_reply {
        p += "xbp github comment N -m: Fixed tip SHA, what changed, red→green, PR URL. ";
        if close_issue {
            p += "close only if close_issue=true and fully done.\n";
        } else {
            p += "Do NOT close issue (close_issue:false).\n";
        }
    } else {
        p += "no github comments (reply:false).\n";
    }
    p += "results[] every MUST_FIX. target_type=issue, issue_number, pr_created_url. LOG_DIR\\last-agent.json\n";

    let ctx = "";
    if g != () && g.urls != () {
        for u in g.urls {
            ctx += u.to_string() + "\n";
        }
        ctx += "---\n";
    }
    let paste_marker = if paste == "" { "" } else { paste.sub_string(0, if paste.len() < 40 { paste.len() } else { 40 }) };
    let cap_full = 4000;
    let cap_multi = 3000;
    if include_full_paste {
        for t in texts {
            let s = t.to_string();
            if paste != "" && (s == paste || (paste_marker != "" && s.len() >= paste_marker.len() && s.sub_string(0, paste_marker.len()) == paste_marker && is_paste(s))) {
                continue;
            }
            if s.len() > cap_full { s = s.sub_string(0, cap_full); }
            ctx += s + "\n---\n";
        }
        if paste != "" {
            let paste_use = paste;
            if paste_use.len() > cap_full { paste_use = paste_use.sub_string(0, cap_full); }
            if paste_marker == "" || !ctx.contains(paste_marker) {
                ctx += paste_use;
            } else if !ctx.contains(paste) {
                ctx += "\n---\n" + paste_use;
            }
        }
    } else {
        let issue_token = "/issues/" + num_s;
        for t in texts {
            let s = t.to_string();
            let sl = s.to_lower();
            let relevant = false;
            if num_s != "" && sl.contains(issue_token) { relevant = true; }
            if g != () && g.urls != () {
                for u in g.urls {
                    if s.contains(u.to_string()) || sl.contains(u.to_string().to_lower()) { relevant = true; }
                }
            }
            for id in i_ids {
                if sl.contains("issuecomment-" + id) { relevant = true; }
            }
            if !relevant { continue; }
            if s.len() > cap_multi { s = s.sub_string(0, cap_multi); }
            ctx += s + "\n---\n";
        }
    }
    p += "\nINPUT (this issue only):\n" + ctx + "\nReturn slim run_schema JSON now.\n";
    p
}

fn build_target_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, close_issue, include_full_paste) {
    let tt = if g != () && g.target_type != () { g.target_type.to_string() } else { "pr" };
    if tt == "issue" {
        return build_issue_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, close_issue, include_full_paste);
    }
    build_go_prompt(g, kind_override, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, include_full_paste)
}

fn build_wide_prompt(g, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, include_full_paste) {
    let pr_s = if g != () && g.pr != () && g.pr.to_string() != "" { g.pr.to_string() } else if g != () && g.number != () { g.number.to_string() } else { "" };
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
    p += build_isolation_preamble("pr", if pr_s != "" { pr_s } else { () }, owner, repo, use_worktree, worktree_path_arg, skip_checkout, do_push);
    p += lean_rules();
    p += "xbp: view + discussions --unresolved --slim --detect-fixed-reply --our-author LOGIN.\n";
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
    p += "Return slim run_schema with worktree_path + log_dir. tool_trace optional ≤12.\n";

    let paste_marker_w = if paste == "" { "" } else { paste.sub_string(0, if paste.len() < 40 { paste.len() } else { 40 }) };
    if include_full_paste {
        for t in texts {
            let s = t.to_string();
            if paste != "" && (s == paste || (paste_marker_w != "" && s.len() >= paste_marker_w.len() && s.sub_string(0, paste_marker_w.len()) == paste_marker_w && is_paste(s))) {
                continue;
            }
            if s.len() > 3000 { s = s.sub_string(0, 3000); }
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
    let report = "# fix-issues-xbp-v3\n\n";
    report += "- **mode:** `" + mode_label + "`\n";
    report += "- **target:** `" + (if out != () && out.target_type != () { out.target_type } else { "?" }) + "`\n";
    report += "- **PR:** #" + (if out != () && out.pr_number != () { out.pr_number.to_string() } else { "?" }) + "\n";
    report += "- **issue:** #" + (if out != () && out.issue_number != () { out.issue_number.to_string() } else { "?" }) + "\n";
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
let issue_arg = ();
if args != () {
    if args.issue != () { issue_arg = args.issue; }
    else if args.issue_number != () { issue_arg = args.issue_number; }
}
let close_issue = false;
if args != () && args.close_issue == true { close_issue = true; }
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
// v3.1: cap concurrent agents (default 4). Full parallel was 20× cold cargo thrash + 26M tokens.
// Set max_concurrency=0 or concurrency=0 for uncapped (legacy behavior).
let max_concurrency = 4;
if args != () {
    if args.max_concurrency != () { max_concurrency = args.max_concurrency; }
    else if args.concurrency != () { max_concurrency = args.concurrency; }
}
if max_concurrency == () { max_concurrency = 4; }
// Rhai may deliver numbers; treat ≤0 as uncapped (use huge batch).
let concurrency_uncapped = false;
if max_concurrency <= 0 {
    concurrency_uncapped = true;
    max_concurrency = 1000;
}

fn run_jobs_batched(jobs, max_concurrency) {
    // parallel() is a barrier with no host-level throttle — batch in Rhai.
    let all = [];
    if jobs == () || jobs.len() == 0 { return all; }
    let n = jobs.len();
    let offset = 0;
    let batch_i = 0;
    while offset < n {
        let batch = [];
        let bi = 0;
        while bi < max_concurrency && (offset + bi) < n {
            batch.push(jobs[offset + bi]);
            bi += 1;
        }
        batch_i += 1;
        log("parallel batch " + batch_i.to_string() + " size=" + batch.len().to_string()
            + " offset=" + offset.to_string() + "/" + n.to_string());
        let batch_results = parallel(batch);
        for r in batch_results {
            all.push(r);
        }
        offset += bi;
    }
    all
}

let texts = collect_texts(args);
let d_ids = extract_ids(texts, "discussion_r");
let i_ids = extract_ids(texts, "issuecomment-");
let r_ids = extract_ids(texts, "pullrequestreview-");
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
if issue_arg == () {
    let iss = extract_issue(texts);
    if iss != () { issue_arg = iss; }
}

// Group by owner/repo#pr-N / #issue-N for multi-target fan-out
let groups = extract_all_groups(texts, pr_arg, issue_arg, repo_arg);
// If groups empty but we have global ids + pr, extract_pr_groups already handled pr_arg.
// If groups empty and unscoped with no pr — single agent detects.

let multi = groups.len() > 1;
log("GROUPS n=" + groups.len().to_string() + " multi=" + (if multi { "1" } else { "0" }));
for g in groups {
    log("  group " + g.key + " d=" + g.d_ids.len().to_string() + " i=" + g.i_ids.len().to_string() + " r=" + (if g.review_ids != () { g.review_ids.len().to_string() } else { "0" }));
}

// kind — mixed keeps classes (global; per-group kind used in multi)
let kind = "unscoped";
if d_ids.len() == 0 && r_ids.len() == 0 && groups.len() > 0 {
    let only_issues = true;
    for g in groups {
        let tt = if g.target_type != () { g.target_type } else { "pr" };
        if tt != "issue" { only_issues = false; }
    }
    if only_issues { kind = "issue"; }
}
if kind == "unscoped" {
    if (d_ids.len() > 0 && i_ids.len() > 0) || (d_ids.len() > 0 && r_ids.len() > 0) || (i_ids.len() > 0 && r_ids.len() > 0) { kind = "mixed"; }
    else if d_ids.len() > 0 { kind = "discussion_r"; }
    else if i_ids.len() > 0 { kind = "issuecomment"; }
    else if r_ids.len() > 0 { kind = "review"; }
    else if issue_arg != () { kind = "issue"; }
    else if is_paste(paste) { kind = "paste"; }
}

// Abort when the command was invoked with no links / PR / paste.
// Bare `/fix-issues-xbp-v3` (or args that only carry workflow meta text) must NOT
// fall through to unscoped "fix all unresolved on current branch" — that spins forever
// and is almost always accidental. Opt-in: args.allow_unscoped=true or args.allow_empty=true.
let has_comment_targets = d_ids.len() > 0 || i_ids.len() > 0 || r_ids.len() > 0;
if args != () && args.comment_ids != () {
    // non-empty array counts even if extract already ran
    let ci = args.comment_ids;
    if type_of(ci) != "()" {
        // Rhai arrays support len
        if ci.len() > 0 { has_comment_targets = true; }
    }
}
let has_paste_scope = is_paste(paste);
let has_pr_scope = pr_arg != ();
let has_issue_scope = issue_arg != ();
if !has_pr_scope || !has_issue_scope {
    for g in groups {
        if g == () { continue; }
        let tt = if g.target_type != () { g.target_type.to_string() } else { "pr" };
        let num = if g.number != () { g.number.to_string() } else { "" };
        if tt == "pr" && (num != "" || (g.pr != () && g.pr.to_string() != "")) { has_pr_scope = true; }
        if tt == "issue" && (num != "" || (g.issue != () && g.issue.to_string() != "")) { has_issue_scope = true; }
    }
}
// Plain github.com/.../pull/N or /issues/N URLs still yield a group.
let allow_empty = false;
if args != () && args.allow_unscoped == true { allow_empty = true; }
if args != () && args.allow_empty == true { allow_empty = true; }

if !has_comment_targets && !has_paste_scope && !has_pr_scope && !has_issue_scope && !allow_empty {
    log("ABORT empty invocation: no issue/PR/discussion/issuecomment/review URL or paste");
    write_scratch_file("abort.json", json_encode(#{
        aborted: true,
        reason: "no_scope",
        message: "Pass at least one GitHub issue URL (/issues/N), PR/discussion/issuecomment/review URL, pr=N, issue=N, or a review paste. Bare /fix-issues-xbp-v3 is not allowed. Opt-in unscoped: allow_unscoped=true.",
        kind: kind,
        d_ids: d_ids,
        i_ids: i_ids,
        r_ids: r_ids,
        pr: pr_arg,
        issue: issue_arg,
        groups: groups,
        texts_len: texts.len(),
    }));
    complete(#{
        summary: "aborted: no issue/PR/discussion URL or paste — re-run with links (e.g. /fix-issues-xbp-v3 https://github.com/org/repo/issues/231)",
        aborted: true,
        reason: "no_scope",
        path: "scratch/abort.json",
        kind: kind,
        groups: groups,
    });
}

// When scoped, size max_comments from inventory so every extracted id fits.
let scoped_count = d_ids.len() + i_ids.len() + r_ids.len();
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
        kind: kind, d_ids: d_ids, i_ids: i_ids, r_ids: r_ids, pr: pr_arg, issue: issue_arg, max_comments: max_comments,
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
    log("MULTI batched fan-out groups=" + groups.len().to_string()
        + " max_concurrency=" + max_concurrency.to_string()
        + " uncapped=" + (if concurrency_uncapped { "1" } else { "0" }));
    let jobs = [];
    for g in groups {
        // worktree_path_arg only applies when single-PR; multi always uses default per-group paths
        let wt = ();
        let gk = group_kind(g);
        // paste-only global with no ids on this group → unscoped for that PR
        if gk == "unscoped" && kind == "paste" && g.d_ids.len() == 0 && g.i_ids.len() == 0 {
            // keep unscoped (or paste if we want) — unscoped inventory for that PR is safer
        }
        let prompt = build_target_prompt(g, gk, max_comments, max_comments_explicit, paste, texts, use_worktree, wt, skip_checkout, do_push, do_reply, update_pr_body, close_issue, false);
        jobs.push(#{
            prompt: prompt,
            label: label_for_group(g),
            capability_mode: "all",
            output_schema: run_schema,
        });
    }
    let results = run_jobs_batched(jobs, max_concurrency);
    let gi = 0;
    for r in results {
        let lab = if gi < groups.len() { label_for_group(groups[gi]) } else { "go-multi" };
        events.push(agent_ev(lab, r));
        gi += 1;
    }
    let group_meta = [];
    for g in groups {
        group_meta.push(#{ key: g.key, target_type: if g.target_type != () { g.target_type } else { "pr" }, owner: g.owner, repo: g.repo, number: if g.number != () { g.number } else { g.pr }, pr: g.pr, issue: if g.issue != () { g.issue } else { "" }, d: g.d_ids.len(), i: g.i_ids.len(), r: if g.review_ids != () { g.review_ids.len() } else { 0 } });
    }
    let totals = flush("one_shot_multi_" + groups.len().to_string(), events, #{
        kind: kind, multi: true, groups: group_meta, d_ids: d_ids, i_ids: i_ids, max_comments: max_comments,
        use_worktree: use_worktree, max_concurrency: max_concurrency, schema: "slim_v31",
    });

    let report = "# fix-issues-xbp-v3 (multi batched v3.1)\n\n";
    report += "- **groups:** " + groups.len().to_string() + "\n";
    report += "- **max_concurrency:** " + max_concurrency.to_string() + "\n";
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

    let path = write_scratch_file("fix-issues-xbp-v3-report.md", report);
    write_scratch_file("fix-issues-xbp-v3-proof-payload.json", json_encode(#{
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
        let tt = if issue_arg != () && pr_arg == () { "issue" } else { "pr" };
        let nums = if tt == "issue" {
            if issue_arg != () { issue_arg.to_string() } else { prs }
        } else { prs };
        g = #{
            key: owner + "/" + repo + "#" + tt + "-" + nums,
            target_type: tt,
            owner: owner,
            repo: repo,
            number: nums,
            pr: if tt == "pr" { nums } else { "" },
            issue: if tt == "issue" { nums } else { "" },
            d_ids: d_ids,
            i_ids: i_ids,
            review_ids: r_ids,
            urls: [],
        };
    }
    // Single-PR: include full paste context
    let prompt = build_target_prompt(g, kind, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, close_issue, true);
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
    let path = write_scratch_file("fix-issues-xbp-v3-report.md", report);
    write_scratch_file("fix-issues-xbp-v3-proof-payload.json", json_encode(out));
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
    log("WIDE multi batched groups=" + groups.len().to_string() + " max_concurrency=" + max_concurrency.to_string());
    let jobs = [];
    for g in groups {
        let prompt = "";
        let tt = if g.target_type != () { g.target_type.to_string() } else { "pr" };
        if tt == "issue" {
            prompt = build_issue_prompt(g, "issue", max_comments, max_comments_explicit, paste, texts, use_worktree, (), skip_checkout, do_push, do_reply, close_issue, false);
        } else {
            prompt = build_wide_prompt(g, max_comments, max_comments_explicit, paste, texts, use_worktree, (), skip_checkout, do_push, do_reply, update_pr_body, false);
        }
        jobs.push(#{
            prompt: prompt,
            label: "wide-" + label_for_group(g),
            capability_mode: "all",
            output_schema: run_schema,
        });
    }
    let results = run_jobs_batched(jobs, max_concurrency);
    let gi = 0;
    for r in results {
        let lab = if gi < groups.len() { "wide-" + label_for_group(groups[gi]) } else { "wide-multi" };
        events.push(agent_ev(lab, r));
        gi += 1;
    }
    let totals = flush("wide_multi_" + groups.len().to_string(), events, #{ multi: true, d_ids: d_ids, i_ids: i_ids });
    let report = "# fix-issues-xbp-v3 (wide multi)\n\n";
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
    let path = write_scratch_file("fix-issues-xbp-v3-report.md", report);
    write_scratch_file("fix-issues-xbp-v3-proof-payload.json", json_encode(#{ multi: true, mode: "wide" }));
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
    let tt_w = if issue_arg != () && pr_arg == () { "issue" } else { "pr" };
    let num_w = if tt_w == "issue" {
        if issue_arg != () { issue_arg.to_string() } else { "" }
    } else {
        if pr_arg != () { pr_arg.to_string() } else { "" }
    };
    g_wide = #{
        key: owner + "/" + repo + "#" + tt_w + "-" + num_w,
        target_type: tt_w,
        owner: owner,
        repo: repo,
        number: num_w,
        pr: if tt_w == "pr" { num_w } else { "" },
        issue: if tt_w == "issue" { num_w } else { "" },
        d_ids: d_ids,
        i_ids: i_ids,
        review_ids: r_ids,
        urls: [],
    };
}
let p = "";
if g_wide != () && g_wide.target_type != () && g_wide.target_type == "issue" {
    p = build_issue_prompt(g_wide, "issue", max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, close_issue, true);
} else {
    p = build_wide_prompt(g_wide, max_comments, max_comments_explicit, paste, texts, use_worktree, worktree_path_arg, skip_checkout, do_push, do_reply, update_pr_body, true);
}
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
let path = write_scratch_file("fix-issues-xbp-v3-report.md", report);
write_scratch_file("fix-issues-xbp-v3-proof-payload.json", json_encode(out));
complete(#{
    path: path,
    summary: "wide n=" + nres.to_string() + " " + totals.total_duration_ms.to_string() + "ms",
    pr: out.pr_number,
    sha: out.sha,
    telemetry: #{ path: "scratch/telemetry.json", totals: totals, mode: "wide" },
    report: report,
});
