# @melchi/artifact-staging

Artifact-first staging workflow and side-by-side comparison CLIs for Cursor (`staged-diff-cursor`) and Google Antigravity (`staged-diff`).

## Overview

Proposed work stays out of the workspace until you apply it. In Cursor, the agent edits copies under `~/.local/share/cursor-artifact-staging/` (same role as Antigravity's brain staging folder). You stay in whatever mode you prefer; the agent must not switch to Plan mode or use **Build** to write the repo. Apply when you are ready with `staged-diff-cursor apply all` or by asking the agent to run that after an explicit request.

Antigravity uses the review artifact's **Proceed** button as its gate. Cursor uses chat plus `staged-diff-cursor apply`. `staged-diff` is Antigravity; `staged-diff-cursor` is Cursor.

| Host | Staging root | Skill | CLI | Diff command |
| :--- | :--- | :--- | :--- | :--- |
| Cursor | `~/.local/share/cursor-artifact-staging/<conversation-id>/staging/` | [`skills/cursor/SKILL.md`](skills/cursor/SKILL.md) | `staged-diff-cursor` | `cursor -r --diff <orig> <staged>` |
| Antigravity | `~/.gemini/antigravity-ide/brain/<conversation-id>/staging/` | [`SKILL.md`](SKILL.md) | `staged-diff` | `antigravity-ide -r -d <orig> <staged>` |

## CLI Usage

```bash
# List all staged files and status ([APPLIED], [MODIFIED], [RELOCATED], [RENAMED], [NEW FILE]):
staged-diff

# Open a specific file diff side-by-side in Antigravity IDE (fuzzy match on filename):
staged-diff ChatLayout
staged-diff queries

# Open side-by-side diff tabs for all modified/relocated files:
staged-diff all

# Apply a single staged file to the workspace:
staged-diff apply -f ChatLayout.svelte
# or fuzzy matched:
staged-diff apply queries

# Apply all staged files and remove obsolete/renamed files:
staged-diff apply all

# Rename a staged file and automatically track the mapping in renames.json:
staged-diff rename src/lib/OldName.svelte src/lib/components/NewName.svelte

# Purge the current session's staging directory:
staged-diff clean

# List/switch staging sessions across projects:
staged-diff --sessions
staged-diff --all-repos
```

## Installation & Symlinks

`~/.zshrc` links both commands into `~/.local/bin` and both completions into `~/.zfunc` before `compinit`. Open a new shell after pulling this repo. `~/.local/bin` is already on `PATH`.

Show usage any time, including when nothing is staged:

```bash
staged-diff --help
staged-diff-cursor --help
```

To refresh the links by hand:

```bash
ln -sfn "$(pwd)/scripts/staged-diff" ~/.local/bin/staged-diff
ln -sfn "$(pwd)/scripts/staged-diff-cursor" ~/.local/bin/staged-diff-cursor
ln -sfn "$(pwd)/completions/_staged-diff" ~/.zfunc/_staged-diff
ln -sfn "$(pwd)/completions/_staged-diff-cursor" ~/.zfunc/_staged-diff-cursor
```

Or from a shell that already has the commands:

```bash
staged-diff --install-completion
staged-diff-cursor --install-completion
```

To install the Cursor skill and configure the sandbox write path:

```bash
staged-diff-cursor --install-cursor-skill
```

That symlinks the skill into `~/.cursor/skills/artifact-first-staging`, creates `~/.local/share/cursor-artifact-staging`, and asks whether to add that path to `~/.cursor/sandbox.json` (plus optional CLI `Write(...)` in `~/.cursor/cli-config.json`). It also asks whether to append an `autoRun.allow_instructions` hint to `~/.cursor/permissions.json` for Auto-review. Use `--yes` to apply both without prompting.

For Cursor, use `staged-diff-cursor` anywhere the examples above say `staged-diff`.

## Cursor sandbox vs approvals

Writing under `~/.local/share/cursor-artifact-staging` and skipping approval prompts are **two different settings**.

**Sandbox writes** — [`~/.cursor/sandbox.json`](https://cursor.com/docs/reference/sandbox) (merged with `<repo>/.cursor/sandbox.json`):

```json
{
  "type": "workspace_readwrite",
  "additionalReadwritePaths": [
    "/Users/you/.local/share/cursor-artifact-staging"
  ]
}
```

`additionalReadwritePaths` is what lets a **sandboxed** agent or shell create files there. Keep `type` as `workspace_readwrite`. `insecure_none` disables the sandbox entirely. The directory is under `~/.local/share` because Cursor write-protects `~/.cursor` except `rules/`, `commands/`, `worktrees/`, `skills/`, and `agents/`, and `sandbox.json` cannot add `artifact-staging` to that list.

After editing `sandbox.json`, **start a new agent session** so the terminal sandbox reloads it. File-edit tools may pick up the path sooner; a sandboxed `mkdir` in the terminal can still fail until the session reloads.

**Approval prompts** — **Cursor Settings → Agents → Approvals & Execution** (see [permissions.json](https://cursor.com/docs/reference/permissions) for file-based allowlists):

| Mode | Behavior |
| :--- | :--- |
| **Auto-review** | Sandboxed commands run without a prompt. Commands that cannot stay sandboxed may still show an approval card. |
| **Allowlist** | Only allowlisted commands, plus sandboxed shell when sandboxing is on. |
| **Run Everything** | No prompts; the sandbox is not what protects those runs. |

A card that offers to **disable the sandbox for one command** is not the same as adding a write path. Prefer keeping the command inside the sandbox via `additionalReadwritePaths`.

Optional: steer Auto-review with `autoRun.allow_instructions` in `~/.cursor/permissions.json`. That only hints the classifier; it does **not** grant filesystem access.

```jsonc
{
  "autoRun": {
    "allow_instructions": [
      "Creating or editing files under ~/.local/share/cursor-artifact-staging for artifact-first staging."
    ]
  }
}
```
