---
name: linear
description: Manage Linear issues, projects, cycles, documents, and team workflows. Use when the user wants to read, create, update, triage, decompose, or close out work in Linear, including issue IDs or links, PR-to-issue association, status changes, completion comments, feature casing, parent issue setup, and ordered sub-issue planning with blocker links.
---

# Linear

Read `references/feature-casing.md` when the user wants a feature, initiative, or larger engineering slice turned into a parent issue plus child issues with explicit execution order, acceptance criteria, and blockers.

Search for available `linear` MCP tools before using this skill. If the Linear MCP server is not available in the current session, say so clearly and fall back to manual guidance.

## Setup

If Linear MCP is not configured yet, use the current HTTP endpoint rather than the deprecated SSE endpoint:

1. Run `codex mcp add linear --url https://mcp.linear.app/mcp`
2. Ensure `rmcp_client = true` is enabled under `[features]` in `~/.codex/config.toml`, or launch Codex with `--enable rmcp_client`
3. Run `codex mcp login linear`

If this is the first successful setup in the current environment, tell the user they may need to restart Codex before retrying the task.

Do not recommend `https://mcp.linear.app/sse` unless the user explicitly asks for legacy transport details.

## Core Rule

Treat Linear as both a tracker and a communication surface.

When a task involves an existing Linear issue, do not stop at code changes alone. Keep the issue current enough that someone reading only Linear can understand the status, scope, and outcome without reconstructing everything from GitHub history.

## Standard Workflow

1. Clarify the goal and identify the relevant issue, project, team, or cycle.
2. Read first: fetch the issue, project, comments, workflow states, and related records before making changes.
3. Read attached images or screenshots if the connector exposes them.
4. Move the issue to `In Progress` when active work actually starts.
5. Implement the requested Linear changes or complete the linked engineering work.
6. Run the relevant validation for the repo or workflow.
7. Associate the PR with the issue when a PR is part of the flow.
8. Update the issue status to the correct handoff state.
9. Leave a completion comment when work has materially progressed or finished.

## Read Before Write

Before creating or updating anything:

- Fetch the full issue or project details.
- Check comments, labels, assignee, priority, cycle, project, and parent issue.
- Check for existing child issues before creating new ones.
- Read screenshots, mockups, or visual attachments when present because raw markdown often misses the actual UI context.
- Confirm the team's workflow state names before moving statuses.

## Issue Workflows

Use this skill for:

- Retrieving or summarizing issues from an ID or Linear link
- Updating status, assignee, labels, priority, cycle, project, or comments
- Creating new issues with self-contained descriptions
- Breaking a larger issue into a sub-issue tree
- Closing the loop between GitHub work and Linear issue status

When the user asks to "handle" a Linear issue, default to this order:

1. Fetch the issue
2. Read its context and attachments
3. Identify related child issues or blockers
4. Update status if active work is starting
5. Complete the requested work
6. Post the result back to Linear

## Project, Cycle, and Team Workflows

Use this skill for:

- Sprint or cycle planning
- Project setup and milestone tracking
- Team workload review
- Documentation audits that create follow-up issues
- Dependency mapping across multiple issues or projects

For larger workflow changes, explain the grouping logic before applying bulk updates.

## Status Updates

Use status changes as coordination signals, not bookkeeping after the fact.

- Move to `In Progress` when active work begins.
- Move to `In Review` when implementation is complete and awaiting review, if that matches the team's workflow.
- Move to `Done` only when it is actually the team's done state. Some teams reserve `Done` for after merge or release.

Match the workspace's existing workflow rather than inventing a new one.

## PR Association

When a pull request is intended to resolve a Linear issue, include a closing keyword and the issue ID in the PR body.

Examples:

- `Fixes ENG-123`
- `Closes ENG-123`
- `Resolves ENG-123`

Replace `ENG-123` with the real issue ID. This is the machine-readable side that links the PR and may auto-close the issue on merge.

## Completion Comments

Do not rely on PR linking alone. Leave a brief completion comment on the issue so reviewers, PMs, and future readers can understand the result from Linear itself.

Use a compact format like:

```markdown
## Changes Summary

- Implemented: brief summary of the delivered change
- Validation: commands run or checks performed
- PR: #123 or PR URL

### Key Notes

- Important behavior change or constraint
- Follow-up context if relevant
```

Keep the comment brief but concrete.

## Creating Issues

When creating issues:

- Match the language of the surrounding conversation unless the workspace has a fixed team standard.
- Write titles that are action-oriented and easy to scan.
- Make the description self-contained enough that another engineer can act without reopening the original chat.
- Add labels, projects, or team-specific metadata only when those conventions already exist in that workspace.

Do not hard-code one organization's labels or naming conventions into the skill.

## Creating Sub-Issue Trees

When decomposing a larger issue:

1. Prefer logical parent-child grouping over a flat list of siblings.
2. Make each sub-issue independently actionable.
3. Create blockers before dependent issues when dependency links require existing issue IDs.
4. Reflect execution order in titles when UI ordering is unreliable.
5. For feature casing, write the parent issue first, then create the child issue set from the execution order, and wire blockers immediately.

Example ordering pattern:

```text
[1] [db] add schema fields
[2] [service] implement business logic
[3] [api] add endpoint
[3.1] [sdk] add client wrapper
[3.1.1] [app] integrate consumer
[4] [ui] ship page changes
```

Use numbering only when it adds clarity.

When the user provides a feature brief, screenshots, or rough bullets and wants it "cased" or "split out":

1. Collapse the request into one parent issue that states the product goal, required outcomes, constraints, and ordered execution plan.
2. Split implementation into child issues only at boundaries that are independently testable or can be owned separately.
3. Use surface-prefixed titles such as `[1] auth-email: ...` or `[4] auth-ui: ...` when the work spans services, APIs, and UI layers.
4. Keep each child issue narrow enough that another engineer can execute it without rereading the parent chat.
5. Prefer `blockedBy` or `blocks` edges that mirror the real implementation order rather than leaving sequencing implicit.
6. If a child depends on a contract or schema addition, put that upstream child first and make the downstream issues depend on it.
7. If the work crosses repos or packages, say that explicitly in the relevant child issue instead of hiding it in the parent only.

## Sub-Issue Content

Each sub-issue should stand on its own. Include:

- Goal
- Key files or surfaces involved
- Acceptance criteria or expected change
- Dependencies on other issues
- Validation steps

Do not assume the implementer will read the parent issue first.

For feature-casing work, use the parent and child templates from `references/feature-casing.md`.

## Language

Match the language of the conversation that triggered the work unless the workspace has an explicit standard. Keep technical identifiers, file paths, commands, and code in their original form.

Apply the same rule when editing existing issues: preserve the established language unless there is a clear reason to change it.

## Available Tool Shapes

Tool names can vary by connector version, but they typically cover:

- Issues: list, get, create, update, comment, labels, statuses
- Projects: list, get, create, update
- Teams and users: list teams, users, and cycles
- Documents: search or retrieve docs related to product work

Inspect the actual exposed tool names in the current session before calling them.

## Practical Workflows

- Sprint planning: review open issues for a team or cycle, group by priority, and create follow-up assignments
- Bug triage: list high-priority bugs, rank by impact, and move the top items into active states
- Documentation audit: search docs, identify gaps, and create issues with concrete follow-up actions
- Team workload balance: group active issues by assignee and flag overloaded owners
- Release planning: create or update a project with milestones, linked issues, and progress updates
- Cross-project dependencies: identify blocked work and create missing links or follow-up issues
- Stale issue cleanup: find issues with outdated status or missing closure comments and bring them current

## Per-Issue Closeout Rule

When handling multiple issues, close out each issue before moving to the next unless the user explicitly asks for batched handling.

Per issue:

1. Complete the implementation or Linear update
2. Run the relevant validation
3. Create or update the PR if needed
4. Update the Linear status appropriately
5. Add the completion comment

This avoids forgotten status updates and missing closure context.

## Troubleshooting

- Authentication failures: re-run `codex mcp login linear` and verify workspace access
- Missing remote MCP support: enable `rmcp_client`
- Missing data: confirm the correct workspace, team, and permissions
- Tool mismatch: inspect actual exposed tool names before assuming a specific call exists
- Bulk updates: break large write operations into smaller batches if the connector or workspace is slow
