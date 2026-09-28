---
name: artifact-first-staging
description: >-
  Stages proposed code as real files under ~/.local/share/cursor-artifact-staging before anything is written to the workspace, with side-by-side review via staged-diff-cursor.
  Use when the user asks to stage changes first, preview edits before applying them, review a patch without a git worktree, or keep the agent from touching the working tree until they approve.
---

# Artifact-First Staging (Cursor)

The staging directory is the only place you edit proposed code. The git workspace stays read-only for writes until the user explicitly asks to apply.

This is the same idea as Antigravity's artifact staging folder, but under Cursor's home directory — not Plan mode. **Do not switch to Plan mode.** **Do not ask the user to click Build.** Build would edit the real repo; this workflow forbids that until apply.

The user may stay in Agent mode (or any mode). Your job is to copy targets into staging, change the staged copies, and stop.

Do not create a git worktree. Do not paste markdown diff blocks instead of writing real staged files.

## Sandbox vs approvals (Cursor)

**Filesystem:** proposed files go under `~/.local/share/cursor-artifact-staging/...`. Cursor write-protects `~/.cursor` except `rules/`, `commands/`, `worktrees/`, `skills/`, and `agents/`, and `sandbox.json` cannot add another folder there. Staging stays outside `~/.cursor` so a sandboxed shell can write it. That path must appear in `~/.cursor/sandbox.json` → `additionalReadwritePaths` (keep `type`: `workspace_readwrite`). Per-repo `.cursor/sandbox.json` is merged. After changes, the user should start a **new agent session** so the terminal sandbox reloads.

**Prompts:** approval cards are separate (Cursor Settings → Agents → Approvals & Execution). `sandbox.json` does not turn prompts off. `permissions.json` `autoRun.allow_instructions` only steers Auto-review; it does not grant write access.

If writes fail, suggest `staged-diff-cursor --install-cursor-skill` to add the sandbox path — not Plan mode, not disabling the sandbox for one command unless the user chooses that on the card.

## Staging root

Like plans live under `~/.cursor/plans/`, staged sources live under:

```
~/.local/share/cursor-artifact-staging/<conversation-id>/
├── .workspace                 # absolute git root, one line — write this first
├── renames.json               # optional: moves, renames, deletions
├── staged_changes.md          # optional review summary for the user
└── staging/                   # mirrors workspace-relative paths — edit here only
    └── src/...
```

**Conversation id:** UUID from the current agent store (`.../cursor_agent_stores/<conversation-id>/files`) or agent transcript folder. Do not invent one.

## Hard rules

1. **Read** workspace files with read tools only.
2. **Write and edit** only paths under `~/.local/share/cursor-artifact-staging/<conversation-id>/staging/<workspace-relative-path>`.
3. **Never** create, modify, or delete files inside the workspace repo for this task — including after the user approves the approach in chat. Approval of the *idea* is not permission to write the repo.
4. **Never** call SwitchMode to Plan (or suggest Plan mode) as part of this workflow.
5. **Never** run `staged-diff-cursor apply` or copy staged files into the workspace unless the user clearly asks to apply (e.g. "apply staged changes", "copy staging to the repo", "run apply all").
6. **Never** run `staged-diff-cursor all` unless the user asks to open every diff tab.
7. Ask before any `git commit`.

Violating (3) breaks the workflow. If you already wrote the workspace by mistake, say so and offer to revert via git; do not treat Build or chat approval as retroactive permission.

## Procedure

1. Resolve `<conversation-id>` and git root. Write `.workspace` with the absolute repo path.
2. For each file to change: read the workspace original, write the full proposed content to `staging/<relative-path>`. For follow-ups, edit only that staged path.
3. **New files:** create only under `staging/`.
4. **Deletes:** add paths to `renames.json` under `"_deletions": ["path/..."]`. Do not delete workspace files.
5. **Renames/moves:** update `renames.json` so each staged relative path maps to the original workspace path.
6. Update `staged_changes.md` with a short overview, table of files (action, staged path, original path), how to run `staged-diff-cursor`, and verification commands to run **after** apply.
7. Tell the user staging is ready, give the session id, and that the workspace is untouched. **Stop** until they ask to apply or request more edits in staging.

## Review and diffs

`staged-diff-cursor` lists sessions for the current repo and opens `cursor -r --diff <workspace-original> <staged>`.

```bash
staged-diff-cursor
staged-diff-cursor <filename>    # only if the user asked to open that diff
staged-diff-cursor apply all       # only after explicit user request to apply
staged-diff-cursor clean
```

Run `staged-diff-cursor` (no args) when helpful so the user sees status tags: `[APPLIED]`, `[MODIFIED]`, `[NEW FILE]`, etc.

## After explicit apply request

From the workspace git root:

1. `staged-diff-cursor apply all`
2. Run the repo's format, lint, and check commands
3. Ask before committing

Until step 1, the workspace must remain unchanged by you.
