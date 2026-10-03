# melchi-shared-useful

A centralized npm workspaces monorepo containing shared tools, developer workflows, IDE extensions, and UI component libraries.

## Workspaces Overview

| Package                                             | Directory                                          | Description                                                                                                                             |
| :-------------------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **[@melchi/design-system](packages/design-system)** | [`packages/design-system`](packages/design-system) | Svelte 5 / SvelteKit UI component library, design system tokens, and client utilities.                                                  |
| **[gbts](packages/gbts)**                           | [`packages/gbts`](packages/gbts)                   | Git Branch Tasks (GBTS) — VS Code and Antigravity IDE extension for tracking branch objectives and TODO comments.                       |
| **[@melchi/git-worktrees](packages/git-worktrees)** | [`packages/git-worktrees`](packages/git-worktrees) | Fast, isolated Git worktree workspace manager (`gitmkwt`/`gmw`, `gitResetDummy`/`grd`, `goto`, `gotoc`, `gwl`) with zsh autocompletion. |
| **[@melchi/staged](packages/staged)**               | [`packages/staged`](packages/staged)               | Unified staging engine and `/stage` skill for AI agents across Cursor, Antigravity, Windsurf, VS Code, JetBrains, Zed, and CLI.         |

---

## Monorepo Management

This repository uses standard **npm workspaces**.

### Install All Dependencies

```bash
npm install
```

### Build All Packages

```bash
npm run build
```

### Run Tests Across Workspaces

```bash
npm run test
```

### Format Code

```bash
npm run format
```

### Lint Across Workspaces

```bash
npm run lint
```

### Target a Specific Workspace

```bash
# Example: build only gbts
npm run build --workspace=gbts

# Example: run dev on design-system
npm run dev --workspace=@melchi/design-system
```
