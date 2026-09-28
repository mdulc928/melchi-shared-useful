#!/usr/bin/env zsh
# ==============================================================================
# Git Worktree Workspace Management (git-worktrees)
# Persistent "workspace N" allocation with local-only dummy branches.
# ==============================================================================

# Resolve the current git repo's root and worktree folder.
# Sets MAIN_REPO and WORKTREE_FOLDER. Fails if not in a git repo.
function _git_repo_info() {
  local common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
  if [ -z "$common_dir" ]; then
    echo "Not inside a git repository"
    return 1
  fi
  MAIN_REPO=$(cd "$common_dir/.." && pwd -P)
  WORKTREE_FOLDER="${MAIN_REPO}.worktrees"
}

# Detect the remote default branch (main or master)
function _git_default_branch() {
  local ref=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null)
  if [ -n "$ref" ]; then
    echo "${ref#refs/remotes/origin/}"
  elif git show-ref --verify --quiet refs/remotes/origin/main 2>/dev/null; then
    echo "main"
  elif git show-ref --verify --quiet refs/remotes/origin/master 2>/dev/null; then
    echo "master"
  else
    echo "main"
  fi
}

# Fetch and checkout a branch, creating from base branch (or origin default branch) if it doesn't exist
# Pass verbose=1 as second arg, base_branch as third arg
function _git_fetch_and_checkout() {
  local branch_name=$1
  local verbose=$2
  local base_branch=$3
  
  if [ -z "$base_branch" ]; then
    base_branch="origin/$(_git_default_branch)"
  fi
  
  if [ "$verbose" = "1" ]; then
    git fetch origin # download latest refs from remote
    if git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then # if branch exists on remote
      git checkout "$branch_name" # switch to the remote-tracking branch
    elif git show-ref --verify --quiet "refs/heads/$branch_name"; then # if branch exists locally
      git checkout "$branch_name" # switch to the local branch
    else # branch doesn't exist anywhere
      echo "Branch '$branch_name' not found. Creating new branch from $base_branch..." # notify the user
      git checkout -b "$branch_name" "$base_branch" # create new branch from base branch
      git branch --unset-upstream "$branch_name" 2>/dev/null # detach from upstream so it's independent
    fi
  else # quiet mode (non-verbose)
    git fetch origin --quiet # download latest refs silently
    if git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then # if branch exists on remote
      git checkout "$branch_name" --quiet # switch to it silently
    elif git show-ref --verify --quiet "refs/heads/$branch_name"; then # if branch exists locally
      git checkout "$branch_name" --quiet # switch to it silently
    else # branch doesn't exist anywhere
      git checkout -b "$branch_name" "$base_branch" --quiet # create from base branch silently
      git branch --unset-upstream "$branch_name" 2>/dev/null --quiet # detach from upstream so it's independent
    fi
  fi
}

# Checkout a branch into a worktree workspace. Uses persistent "workspace N" folders
# with local-only dummy branches. Reuses free workspaces or creates new ones as needed. 
# Options:
#   -v, --verbose           Show verbose output
#   -s, --source <branch>   Base new branch on specified branch
#   -sc, --source-current   Base new branch on current active branch
function gitmkwt() {
  local MAIN_REPO WORKTREE_FOLDER
  _git_repo_info || return 1
  local CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  local verbose=0
  local BASE_BRANCH=""
  local BRANCH_NAME=""
  
  # Parse arguments
  while [ $# -gt 0 ]; do
    case "$1" in
      -v|--verbose)
        verbose=1
        shift
        ;;
      -sc|--source-current)
        if [ -n "$CURRENT_BRANCH" ]; then
          BASE_BRANCH="$CURRENT_BRANCH"
        fi
        shift
        ;;
      -s|--source)
        BASE_BRANCH="$2"
        shift 2
        ;;
      *)
        BRANCH_NAME="$1"
        shift
        ;;
    esac
  done

  if [ -z "$BRANCH_NAME" ]; then
    echo "Usage: gitmkwt [-v] [-sc | -s <base_branch>] <branch-name>"
    return 1
  fi

  # Prune any stale worktree metadata where folders were deleted
  git worktree prune 2>/dev/null

  # Check if branch is already checked out in a worktree
  local existing_worktree=$(git worktree list | grep "\\[$BRANCH_NAME\\]" | sed -E 's/[[:space:]]+[a-f0-9]+[[:space:]]+\[.*\]$//')
  
  if [ -n "$existing_worktree" ]; then
    if [ -d "$existing_worktree" ]; then
      [ "$verbose" = "1" ] && echo "Branch '$BRANCH_NAME' is already checked out at: $existing_worktree"
      cd "$existing_worktree" || return 1
      return 0
    fi
    # If the folder was removed from disk, prune stale entry
    git worktree prune 2>/dev/null
  fi

  local default_branch=$(_git_default_branch)
  local origin_target="origin/$default_branch"

  # Ensure worktrees directory exists
  [ ! -d "$WORKTREE_FOLDER" ] && mkdir -p "$WORKTREE_FOLDER"

  # Fail-safe: For any existing workspace folder, ensure its dummy branch exists
  for dir in "$WORKTREE_FOLDER"/workspace\ *(/N); do
    if [ -d "$dir" ]; then
      local num=$(echo "$dir" | grep -o 'workspace [0-9]*' | grep -o '[0-9]*')
      if [ -n "$num" ]; then
        local ws_dummy="dummy-$num"
        if ! git show-ref --verify --quiet "refs/heads/$ws_dummy"; then
          [ "$verbose" = "1" ] && echo "Workspace $num folder exists without '$ws_dummy'. Creating '$ws_dummy' from $origin_target (no-track)..."
          git branch --no-track "$ws_dummy" "$origin_target" 2>/dev/null
          git branch --unset-upstream "$ws_dummy" 2>/dev/null
        fi
      fi
    fi
  done

  # Find a free workspace (one with a dummy branch)
  # Main repo uses "dummy", numbered workspaces use "dummy-N"
  local free_workspace=""
  local free_workspace_path=""
  
  while IFS= read -r line; do
    local ws_path=$(echo "$line" | sed -E 's/[[:space:]]+[a-f0-9]+[[:space:]]+\[.*\]$//')
    local ws_branch=$(echo "$line" | grep -o '\[.*\]' | sed 's/\[//g' | sed 's/\]//g')
    
    # Main repo with "dummy" branch
    if [[ "$ws_path" == "$MAIN_REPO" ]] && [[ "$ws_branch" == "dummy" ]]; then
      free_workspace="$ws_branch"
      free_workspace_path="$ws_path"
      break
    fi
    
    # Numbered workspace with "dummy-N" branch
    if [[ "$ws_path" == "$WORKTREE_FOLDER/workspace "* ]] && [[ "$ws_branch" =~ ^dummy-[0-9]+$ ]]; then
      free_workspace="$ws_branch"
      free_workspace_path="$ws_path"
      break
    fi
  done < <(git worktree list)

  if [ -n "$free_workspace_path" ]; then
    [ "$verbose" = "1" ] && echo "Found free workspace at: $free_workspace_path (on branch $free_workspace)"
    cd "$free_workspace_path" || return 1
    _git_fetch_and_checkout "$BRANCH_NAME" "$verbose" "$BASE_BRANCH"
    return 0
  fi

  # No free workspace found - allocate/create a new one
  # Find lowest workspace number whose directory does not exist on disk
  local next_num=1
  while [ -d "$WORKTREE_FOLDER/workspace $next_num" ]; do
    # If the directory exists but is completely empty, remove it to reclaim slot
    rmdir "$WORKTREE_FOLDER/workspace $next_num" 2>/dev/null && break
    next_num=$((next_num + 1))
  done
  
  local new_workspace_path="$WORKTREE_FOLDER/workspace $next_num"
  local dummy_branch="dummy-$next_num"

  [ "$verbose" = "1" ] && echo "Creating new workspace $next_num at: $new_workspace_path"
  
  cd "$MAIN_REPO" || return 1
  git fetch origin --quiet

  # Fail-safe: If dummy branch already exists, reset it to origin default branch and proceed (without tracking)
  if git show-ref --verify --quiet "refs/heads/$dummy_branch"; then
    [ "$verbose" = "1" ] && echo "Branch '$dummy_branch' already exists. Resetting to $origin_target (no-track)..."
    git branch --no-track -f "$dummy_branch" "$origin_target" >/dev/null 2>&1
    git branch --unset-upstream "$dummy_branch" 2>/dev/null
    if [ "$verbose" = "1" ]; then
      git worktree add "$new_workspace_path" "$dummy_branch" || return 1
    else
      git worktree add "$new_workspace_path" "$dummy_branch" --quiet || return 1
    fi
  else
    if [ "$verbose" = "1" ]; then
      git worktree add --no-track -b "$dummy_branch" "$new_workspace_path" "$origin_target" || return 1
    else
      git worktree add --no-track -b "$dummy_branch" "$new_workspace_path" "$origin_target" --quiet || return 1
    fi
    git branch --unset-upstream "$dummy_branch" 2>/dev/null
  fi
  
  cd "$new_workspace_path" || {
    echo "Failed to navigate to $new_workspace_path" >&2
    return 1
  }
  _git_fetch_and_checkout "$BRANCH_NAME" "$verbose" "$BASE_BRANCH"
  
  [ "$verbose" = "1" ] && echo "Workspace $next_num ready with branch '$BRANCH_NAME'"
  return 0
}

# Autocomplete for gitmkwt - suggests remote and local branch names
function _gitmkwt_completion() {
  local -a branches
  local local_branches=($(git branch --format='%(refname:short)' 2>/dev/null))
  local remote_branches=($(git branch -r --format='%(refname:short)' 2>/dev/null | sed 's|^origin/||' | grep -v '^HEAD$'))
  branches=(${(u)local_branches[@]} ${(u)remote_branches[@]})
  _describe 'branches' branches
}

compdef _gitmkwt_completion gitmkwt 2>/dev/null || true
alias gmw="gitmkwt"
compdef _gitmkwt_completion gmw 2>/dev/null || true

# Reset current workspace to its dummy branch and rebase dummy on origin/master.
# Opposite of gitmkwt. Pass -v for verbose output.
function gitResetDummy() {
  local MAIN_REPO WORKTREE_FOLDER
  _git_repo_info || return 1
  local verbose=0

  while [ $# -gt 0 ]; do
    case "$1" in
      -v|--verbose)
        verbose=1
        shift
        ;;
      *)
        echo "Usage: gitResetDummy [-v]"
        return 1
        ;;
    esac
  done

  local current_path=$(pwd -P)
  local dummy_branch=""

  if [[ "$current_path" == "$MAIN_REPO" ]]; then
    dummy_branch="dummy"
  elif [[ "$current_path" == "$WORKTREE_FOLDER"/workspace\ * ]]; then
    local workspace_num=$(echo "$current_path" | grep -o 'workspace [0-9]*' | grep -o '[0-9]*')
    if [ -z "$workspace_num" ]; then
      echo "Could not determine workspace number from path: $current_path"
      return 1
    fi
    dummy_branch="dummy-$workspace_num"
  else
    echo "Current directory is not a workspace: $current_path"
    return 1
  fi

  local default_branch=$(_git_default_branch)
  local origin_target="origin/$default_branch"

  if [ "$verbose" = "1" ]; then
    echo "Resetting workspace to branch '$dummy_branch' (pointing to $origin_target, no tracking)"
    git fetch origin
    git checkout --no-track -B "$dummy_branch" "$origin_target"
    git branch --unset-upstream "$dummy_branch" 2>/dev/null
    echo "Workspace reset to '$dummy_branch' (reset to $origin_target)"
  else
    git fetch origin --quiet
    git checkout --no-track -B "$dummy_branch" "$origin_target" --quiet
    git branch --unset-upstream "$dummy_branch" 2>/dev/null
  fi
}

alias grd="gitResetDummy"

# Function to delete worktrees
function gitrmwt() {
  local MAIN_REPO WORKTREE_FOLDER
  _git_repo_info || return 1
  local BRANCH_NAME=$1

  if [ -z "$BRANCH_NAME" ]; then
    echo "Please provide a branch name"
    return 1
  fi

  local WORKTREE_PATH="$WORKTREE_FOLDER/$BRANCH_NAME"

  if [ -d "$WORKTREE_PATH" ]; then
    echo "Deleting worktree for branch '$BRANCH_NAME'."
    git worktree remove "$WORKTREE_PATH"
    git worktree prune
    git rm -rf "$WORKTREE_PATH"
  else
    echo "Worktree for branch '$BRANCH_NAME' does not exist."
  fi
}

# Function to navigate to a git worktree folder by branch name
function goto() {
  local branch_name=$1

  if [ -z "$branch_name" ]; then
    echo "Usage: goto <branch-name>"
    echo "Available worktrees:"
    git worktree list
    return 1
  fi

  local worktree_path=$(git worktree list | grep "\\[$branch_name\\]" | sed -E 's/[[:space:]]+[a-f0-9]+[[:space:]]+\[.*\]$//')
  
  if [ -z "$worktree_path" ]; then
    echo "No worktree found for branch '$branch_name'"
    echo "Available worktrees:"
    git worktree list
    return 1
  fi

  if [ -d "$worktree_path" ]; then
    echo "Navigating to: $worktree_path"
    cd "$worktree_path"
  else
    echo "Worktree path '$worktree_path' does not exist"
    return 1
  fi
}

function gotoc() {
  local branch_name=$1

  if [ -z "$branch_name" ]; then
    echo "Usage: gotoc <branch-name>"
    echo "Available worktrees:"
    git worktree list
    return 1
  fi

  local worktree_path=$(git worktree list | grep "\\[$branch_name\\]" | sed -E 's/[[:space:]]+[a-f0-9]+[[:space:]]+\[.*\]$//')
  
  if [ -z "$worktree_path" ]; then
    echo "No worktree found for branch '$branch_name'"
    echo "Available worktrees:"
    git worktree list
    return 1
  fi

  cursor "$worktree_path"
}

# Auto-completion for goto function
function _goto_completion() {
  local -a branches
  branches=($(git worktree list 2>/dev/null | grep -o '\[.*\]' | sed 's/\[//g' | sed 's/\]//g'))
  _describe 'branches' branches
}

compdef _goto_completion goto 2>/dev/null || true
compdef _goto_completion gotoc 2>/dev/null || true

alias gwl="git worktree list"
