---
name: artifact-first-staging
description: >-
  Workflow for staging code changes, new files, and refactors directly inside the artifacts folder before applying them to the local workspace.
  Use when the user asks to stage changes in an artifact first, wants the artifacts folder to act as the working environment, requests previewing proposed edits in real files before writing to the workspace, or asks for an approval-gated patch proposal without needing a git worktree.
---

# Artifact-First Staging Workflow

This skill defines a safety-first, non-intrusive development workflow where the **conversation artifacts folder serves as the staging workspace**. All proposed source code modifications, new files, and refactors are physically created and edited inside the artifacts directory first, allowing full review of real files before anything is copied to the workspace.

---

## 1. Core Principles

- **Artifacts Folder as the Workspace**: The artifacts folder (`<appDataDir>/brain/<conversation-id>/staging/`) acts as the working directory during the staging phase. Real files (`.svelte`, `.ts`, `.js`, `.css`, etc.) are created and modified there on disk, preserving relative project paths.
- **No Git Worktree Needed**: When using the artifact staging workflow, **do NOT create or allocate a git worktree**. The artifacts directory provides complete file-level isolation. Running dev servers (`npm run dev`, Vite), editor buffers, and git status in the workspace remain completely undisturbed without the overhead of creating worktrees.
- **Real Files, Not Markdown Text Diffs**: Never output raw markdown diff blocks (` ```diff `) as a substitute for code changes. Instead, write the actual updated or new source files to the staging directory. This allows the user and the IDE to view real syntax highlighting, use editor language tooling, and perform native file comparisons.
- **Side-by-Side Review Dashboard**: A dedicated review artifact (`staged_changes.md`) is maintained with direct clickable links (`file:///`) to both the **staged file** and the **original workspace file**, giving the user an immediate side-by-side inspection experience in the editor.
- **Interactive Side-by-Side IDE Diffs (`staged-diff`)**: The workflow includes a native side-by-side diff command (`staged-diff`) that interfaces with Antigravity IDE's editor diff engine (`antigravity-ide -r -d <orig> <staged>`). The user or agent can launch color-coded, graphical diff tabs for any staged file (or `staged-diff all` for all modified/relocated files) directly in their active editor window.
- **Interactive Approval Gating**: The review artifact must be created with `RequestFeedback: true` in `ArtifactMetadata` to present the native **"Proceed"** button in Antigravity. No workspace files may be touched until the user explicitly approves or clicks "Proceed".
- **Clean Copy to Workspace**: Once approved, files are cleanly transferred from the staging directory into the workspace, followed by workspace validation (`npm run format`, `npm run lint`, `npm run check`).

---

## 2. Directory Structure

Inside the conversation's brain directory (`<appDataDir>/brain/<conversation-id>/`):

```
<conversation-id>/
├── staged_changes.md          # Review dashboard artifact (RequestFeedback: true)
├── diff_viewer.md             # Optional compiled git-diff artifact
└── staging/                   # Staging workspace root (mirrors project paths)
    ├── src/
    │   ├── lib/
    │   │   └── theme.ts       # Actual staged file on disk
    │   └── routes/
    │       └── layout.css     # Actual staged file on disk
    └── ...
```

The skill itself provides the companion tool in `scripts/`:

```
artifact-first-staging/
├── SKILL.md
└── scripts/
    └── staged-diff            # Installed to ~/.local/bin/staged-diff
```

---

## 3. Step-by-Step Procedure

### Step 1: Research & Setup Staging Target

1. Read the target workspace files using read tools (`view_file`, `grep_search`, `list_dir`).
2. Identify the active conversation artifact directory:
   `<appDataDir>/brain/<conversation-id>/`
3. Plan the target paths in the staging directory:
   `<appDataDir>/brain/<conversation-id>/staging/<relative-workspace-path>`

### Step 2: Implement Changes in the Staging Workspace

1. **For Modified Files**:
   - Read the original workspace file content using `view_file`.
   - Write the modified version into the staging directory using `write_to_file` (e.g. TargetFile: `<artifactsDir>/staging/src/routes/layout.css`).
   - For incremental adjustments, you can use `replace_file_content`, `multi_replace_file_content`, or `write_to_file` directly targeting the staged file.
2. **For New Files**:
   - Write the new file directly into `<artifactsDir>/staging/<relative-workspace-path>` using `write_to_file`.
3. **For Deleted Files**:
   - Note the pending deletion in the review artifact (do not delete from the workspace yet).
4. **Remember**: Do NOT generate static markdown diff text blocks. Write the actual source files on disk so they are valid, inspectable files.

### Step 3: Create the Review Dashboard Artifact (`staged_changes.md`)

1. Create or update `staged_changes.md` in `<appDataDir>/brain/<conversation-id>/staged_changes.md`.
2. Set `ArtifactMetadata`:
   - `UserFacing: true`
   - `RequestFeedback: true`
   - `Summary`: Concise overview of the staged modifications ready for review.
3. Structure `staged_changes.md`:
   - **Overview**: Executive summary of the implemented feature or fix.
   - **Staged Files Table**: Listing all impacted files with clickable links to both the staged file and the workspace file:
     | Action | Staged File (Artifacts) | Original Workspace File | Description |
     | :--- | :--- | :--- | :--- |
     | `[MODIFY]` | [`staging/src/routes/layout.css`](file:///<artifactsDir>/staging/src/routes/layout.css) | [`src/routes/layout.css`](file:///<workspaceDir>/src/routes/layout.css) | Added universal cursor pointer & hover states |
     | `[NEW]` | [`staging/src/lib/new-util.ts`](file:///<artifactsDir>/staging/src/lib/new-util.ts) | _N/A (New)_ | Utility functions for responsive styling |
   - **Detailed File Changes**: Bullet-point explanations of key logic, styles, and architecture changes per file.
   - **Verification Plan**: Exact validation commands to run once approved (e.g., `npm run format && npm run lint && npm run check`).

### Step 4: Await Review & Refine

1. Notify the user that changes are staged in the artifacts folder, providing the links to the review document and staged files.
2. If the user requests refinements or changes:
   - Make edits directly to the files in `<artifactsDir>/staging/`.
   - Update `staged_changes.md` with `RequestFeedback: true`.
3. **STOP and wait** for explicit confirmation or the user clicking **Proceed**. Never write to the workspace during this step.

### Step 5: Transfer to Workspace & Verify

1. Once the user approves:
   - Copy each file from `<artifactsDir>/staging/<relative-path>` to `<workspaceDir>/<relative-path>` using `write_to_file` with `Overwrite: true` (or file copy operations).
   - Delete any workspace files flagged for deletion.
2. Run project verification commands in the workspace:
   ```bash
   npm run format
   npm run lint
   npm run check
   ```
3. Update `staged_changes.md`:
   - Set `RequestFeedback: false` in `ArtifactMetadata`.
   - Add a note at the top: `> [!NOTE] Status: APPLIED & VERIFIED ✅`.
   - Document the verification output.
4. **Git Commit Policy**: Always ask the user before creating any git commits (`git commit`). Never commit automatically.

---

## 4. Side-by-Side Diffing with `staged-diff`

To give users an effortless, editor-native inspection experience, the skill provides a universal `staged-diff` CLI utility (located at `~/.gemini/config/skills/artifact-first-staging/scripts/staged-diff` and installed to `~/.local/bin/staged-diff`).

### How `staged-diff` Works:

1. **Auto-Discovery**: Automatically detects the active/most recent staging directory in `~/.gemini/antigravity-ide/brain/*/staging`.
2. **Explicit Rename & Relocation Tracking**: Checks for a `renames.json` manifest in the conversation folder or staging directory (`{"<staged_path>": "<original_workspace_path>"}`). This guarantees 100% precision when files are moved to new locations or renamed, preventing false positives with unrelated files having the same basename.
3. **Smart Resolution**: Inspects all staged files, resolving:
   - **`[APPLIED]`**: Workspace file is present and staged changes are already applied (content in workspace matches staged version).
   - **`[MODIFIED]`**: File exists in workspace but contains unapplied pending changes.
   - **`[RENAMED]`**: Tracked via `renames.json` with a new filename.
   - **`[RELOCATED]`**: Tracked via `renames.json` or uniquely mapped to a relocated subdirectory.
   - **`[NEW FILE]`**: Truly new files with no workspace predecessor.
4. **Native IDE Diffs**: Interfaces directly with Antigravity IDE's editor engine (`antigravity-ide -r -d <orig> <staged>`) to open interactive, side-by-side color-coded diff tabs right in the user's active window without creating git commits or touching active workspace files.

### CLI Usage:

```bash
# List all staged files and their status ([APPLIED], [MODIFIED], [RELOCATED], [RENAMED], [NEW FILE]):
staged-diff

# Open a specific file diff side-by-side (fuzzy match on filename):
staged-diff ChatLayout
staged-diff queries

# Open side-by-side diff tabs for all modified/relocated files:
staged-diff all

# Apply a single staged file to the workspace:
staged-diff apply -f ChatLayout.svelte
# or using --file:
staged-diff apply --file ChatLayout.svelte
# or fuzzy matched:
staged-diff apply queries

# Apply all staged files and remove obsolete/renamed files:
staged-diff apply all

# Rename a staged file and automatically track the mapping in renames.json:
staged-diff rename src/lib/OldName.svelte src/lib/components/NewName.svelte
```

### Agent Guidelines for Diffs, Renames & Multi-Repo Isolation:

- **Write `.workspace`**: Always create `<conv_dir>/.workspace` containing the workspace root path (e.g. `/Users/.../my-repo`) when staging files so `staged-diff` accurately associates staging sessions with the current repository.
- **Repo-Aware Isolation**: `staged-diff` automatically detects the current Git repository and shows only the staged files belonging to that repo. Use `staged-diff --all-repos` to view staging sessions across all projects, or `staged-diff --conv <id>` to target an explicit conversation.
- **Maintain `renames.json`**: Whenever staging relocated or renamed files, always write or update `<conv_dir>/renames.json` mapping each staged file to its original workspace predecessor.
- **Clean Workspace On Apply**: When applying staged files to the workspace, use `renames.json` to delete the original workspace files that were relocated/renamed.
- In `staged_changes.md`, always document how the user can inspect diffs using `staged-diff <filename>` or `staged-diff all`.
- When appropriate, generate a companion `diff_viewer.md` artifact showing the compiled `git diff --no-index` output for quick in-dashboard reading.
- **CRITICAL**: The agent must NEVER run `staged-diff all` automatically, as doing so abruptly opens tabs for every staged file in the user's active editor while they are working. Only run `staged-diff <filename>` if the user explicitly asks to open a specific diff tab, or let the user run it themselves.
