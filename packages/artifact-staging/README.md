# @melchi/artifact-staging

Artifact-first staging workflow skill and `staged-diff` side-by-side IDE comparison CLI for Google Antigravity.

## Overview

This package provides:

1. **Artifact-First Staging Workflow Skill** (`SKILL.md`): Defines a safe staging mechanism where proposed source code modifications, new files, and refactors are written to `<appDataDir>/brain/<conversation-id>/staging/` before touching the active workspace.
2. **`staged-diff` CLI** (`scripts/staged-diff`): Universal python CLI tool interfacing directly with Antigravity IDE's native side-by-side diff engine (`antigravity-ide -r -d <orig> <staged>`).

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

To make `staged-diff` globally executable:

```bash
ln -sf "$(pwd)/scripts/staged-diff" ~/.local/bin/staged-diff
```

To enable shell tab completion in zsh:

```bash
staged-diff --install-completion
```
