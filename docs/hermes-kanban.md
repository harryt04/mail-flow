# Hermes Kanban ops (mail-flow)

How MailFlow work is dispatched on the shared Hermes Kanban portfolio board.
This is ops process for agents/humans — not application runtime code.

## Tenant + roles

| Concept | Value | Role |
|---|---|---|
| Tenant | `mail-flow` | Isolates this repo’s cards on the portfolio board |
| Orchestrator | `jarvis` | Plans, decomposes, creates child cards; does not implement |
| Implementer | `coder` | Picks up ready implement tasks in a worktree workspace |
| Board model | one Portfolio board | Multi-repo HQ via `tenant=<repo-slug>`, not board-per-repo |

## Worker flow (coder)

1. `kanban_show` — read body, parent handoffs, comments, workspace path/branch.
2. Work only inside `$HERMES_KANBAN_WORKSPACE` (usually a git worktree).
3. Follow repo conventions: read `docs/` first; for JS/TS changes finish with
   `pnpm run prettify && pnpm run ci`.
4. Prefer a small branch + PR over pushing `master` directly. Do not merge.
5. End the run with exactly one terminator:
   - `kanban_complete` — docs-only / no review needed, or
   - `kanban_block(reason="review-required: …")` — code/docs that need human eyes
     (include PR URL or branch name in the reason; put structured metadata in a comment).

## PR + review-required

- Ship on a feature/docs branch; open a PR against `master`.
- Do **not** merge from the worker. Human reviews, then merges or requests changes.
- After opening the PR, leave a `kanban_comment` with `changed_files`, tests, PR URL,
  then `kanban_block` with `review-required: …` so the dashboard surfaces the card.

## Workspace rules

- `worktree` cards: commit in the task worktree/branch only.
- No secrets in summaries, comments, commits, or docs.
- No scope creep: spawn follow-ups with `kanban_create` + the right assignee;
  do not reassign strategy work to `coder`.

## Related

- Doc map: [README.md](./README.md)
- Task routing: [DECISION-TREE.md](./DECISION-TREE.md)
