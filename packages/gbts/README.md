# Git Branch Tasks (GBTS)

**Git Branch Tasks (GBTS)** is a powerful VS Code / Antigravity extension that automatically extracts and tracks TODO comments across branches, unpushed commits, and whole projects.

---

## 🎯 4 Selectable Scan Scopes

| Scope                | Icon | Description                                                                                                   |
| :------------------- | :--: | :------------------------------------------------------------------------------------------------------------ |
| **Branch Diff**      |  🌿  | Shows only TODOs added/modified on the current branch vs base branch (`main` / `master`).                     |
| **All Project**      |  🌐  | Instant scan of all active TODO comments across the entire codebase (via `git grep`, ignores `node_modules`). |
| **Unpushed Commits** |  🚀  | Shows TODOs in local commits that haven't been pushed to remote yet (`@{upstream}..HEAD`).                    |
| **Uncommitted Only** |  📝  | Shows only dirty/staged TODO comments currently in the working tree.                                          |

---

## ✨ Features

- 🌿 **Smart Branch Scoping**: Filters out legacy TODOs on `main` when working in a feature branch.
- 🪟 **Pop-Out Floating Window**: Pop out into a standalone floating desktop dashboard (`⧉`).
- ⚡ **Real-Time Auto Refresh**: Rescans on branch switch, file save, and Git commit.
- ⚙️ **Configurable Prefixes**: Detects `TODO`, `FIXME`, `NOTE`, `HACK`, `BUG`, `XXX`, `REVIEW`, or any custom tags.
- 👤 **Author Support**: Recognizes author tags like `// TODO(mel): refactor this`.
- 🧭 **Click-to-Jump**: Click any item to jump straight to that file & line.
- 🗂️ **Flexible Grouping**: Group by **File**, group by **Prefix**, or view as a **Flat list**.
- 📋 **Copy as Markdown**: Export your branch tasks directly into markdown checklist format for Pull Request descriptions.

---

## ⌨️ Shortcuts & Commands

| Command                 | Shortcut / Location            | Description                                                    |
| :---------------------- | :----------------------------- | :------------------------------------------------------------- |
| **Switch Scan Scope**   | _Sidebar `$(filter)`_          | Choose between Branch Diff, All Project, Unpushed, Uncommitted |
| **Pop Out to Window**   | _Sidebar `$(link-external)`_   | Open floating dashboard                                        |
| **Insert TODO Comment** | `Cmd+Shift+T` / `Ctrl+Shift+T` | Prompts for prefix & description, inserts at cursor            |
| **Switch Grouping**     | _Sidebar `$(list-tree)`_       | Cycles grouping between File, Prefix, and Flat                 |
| **Copy as Markdown**    | _Sidebar `$(clippy)`_          | Copies task checklist for PR descriptions                      |
| **Refresh Tasks**       | _Sidebar `$(refresh)`_         | Rescans Git repository                                         |
