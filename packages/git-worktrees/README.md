# @melchi/git-worktrees

Git worktree workspace management tools, persistent dummy branch allocation, aliases, and zsh autocompletion.

## Overview

`git-worktrees` manages isolated, persistent worktree workspaces (e.g. `../<repo>.worktrees/workspace 1`, `workspace 2`, etc.) anchored by local dummy branches (`dummy-1`, `dummy-2`), ensuring fast context switching without detached HEAD states or conflicting checkouts.

## Setup in Zsh

Add the following to your `~/.zshrc`:

```zsh
if [ -f "$HOME/DevProjects/melchi-shared-useful/packages/git-worktrees/git-worktrees.zsh" ]; then
  source "$HOME/DevProjects/melchi-shared-useful/packages/git-worktrees/git-worktrees.zsh"
fi
```

## Available Commands

### `gitmkwt` (alias `gmw`)

Allocates or reuses a worktree workspace and checks out a target branch.

```bash
# Checkout or create branch from default origin branch
gmw my-feature-branch

# Base new branch on active current branch
gmw -sc my-sub-feature

# Base new branch on specific base branch
gmw -s main my-hotfix

# Verbose output
gmw -v my-feature
```

### `gitResetDummy` (alias `grd`)

Resets the current worktree workspace to its clean dummy branch (`dummy-N`) and rebases it against latest `origin/<default-branch>`.

```bash
grd
grd -v
```

### `goto` & `gotoc`

Quickly jump to an existing worktree by branch name:

```bash
# Navigate terminal cd to worktree for branch
goto my-feature-branch

# Open worktree folder in Cursor editor
gotoc my-feature-branch
```

### `gwl`

Alias for `git worktree list`.

### `gitrmwt <branch-name>`

Prunes and deletes a designated worktree.
