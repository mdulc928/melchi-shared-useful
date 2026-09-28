import * as vscode from 'vscode';
import { BranchTodoTreeDataProvider } from './treeDataProvider';
import { GitService } from './gitService';
import { ObjectiveStore } from './objectiveStore';
import { TodoScanner } from './scanner';
import { TodoItem, BranchObjective, ScanScope, GbtsConfiguration, GroupMode } from './types';
import * as path from 'path';

export class GbtsWebviewPanel {
	public static readonly viewType = 'gbts.dashboard';
	public static currentPanel: GbtsWebviewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _debounceTimer: NodeJS.Timeout | undefined;

	public static createOrShow(
		context: vscode.ExtensionContext,
		treeDataProvider: BranchTodoTreeDataProvider,
		objectiveStore: ObjectiveStore,
		scanner: TodoScanner,
		gitService: GitService
	) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (GbtsWebviewPanel.currentPanel) {
			GbtsWebviewPanel.currentPanel._panel.reveal(column);
			GbtsWebviewPanel.currentPanel.update();
			return GbtsWebviewPanel.currentPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			GbtsWebviewPanel.viewType,
			'Branch Tasks',
			column || vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [context.extensionUri]
			}
		);

		GbtsWebviewPanel.currentPanel = new GbtsWebviewPanel(
			panel,
			context,
			treeDataProvider,
			objectiveStore,
			scanner,
			gitService
		);
		return GbtsWebviewPanel.currentPanel;
	}

	public static revive(
		panel: vscode.WebviewPanel,
		context: vscode.ExtensionContext,
		treeDataProvider: BranchTodoTreeDataProvider,
		objectiveStore: ObjectiveStore,
		scanner: TodoScanner,
		gitService: GitService
	) {
		if (GbtsWebviewPanel.currentPanel) {
			GbtsWebviewPanel.currentPanel.dispose();
		}
		GbtsWebviewPanel.currentPanel = new GbtsWebviewPanel(
			panel,
			context,
			treeDataProvider,
			objectiveStore,
			scanner,
			gitService
		);
		return GbtsWebviewPanel.currentPanel;
	}

	private constructor(
		panel: vscode.WebviewPanel,
		private context: vscode.ExtensionContext,
		private treeDataProvider: BranchTodoTreeDataProvider,
		private objectiveStore: ObjectiveStore,
		private scanner: TodoScanner,
		private gitService: GitService
	) {
		this._panel = panel;
		this._extensionUri = context.extensionUri;

		this._panel.iconPath = {
			light: vscode.Uri.file(this.context.asAbsolutePath(path.join('media', 'icon.svg'))),
			dark: vscode.Uri.file(this.context.asAbsolutePath(path.join('media', 'icon.svg')))
		};

		this._updateHtml();

		// Live sync listeners
		this._disposables.push(
			this.gitService.onDidChange(() => this.debouncedUpdate(100)),
			this.objectiveStore.onDidChangeObjectives(() => this.debouncedUpdate(50)),
			vscode.workspace.onDidChangeTextDocument((e) => {
				if (!e.document.isUntitled) {
					this.debouncedUpdate(350);
				}
			}),
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('gbts')) {
					this.debouncedUpdate(50);
				}
			}),
			this._panel.onDidDispose(() => this.dispose(), null, this._disposables),
			this._panel.webview.onDidReceiveMessage(
				async (message) => {
					const currentBranch = this.gitService.getCurrentBranch();
					switch (message.command) {
						case 'ready':
							// Webview is loaded and ready for initial state
							this.update();
							break;
						case 'jumpToLine':
							vscode.commands.executeCommand('gbts.jumpToLine', message.todo);
							break;
						case 'addObjective':
							if (message.text && message.text.trim().length > 0) {
								await this.objectiveStore.addObjective(currentBranch, message.text.trim());
								this.update();
							}
							break;
						case 'toggleObjective':
							await this.objectiveStore.toggleObjective(message.id, currentBranch);
							this.update();
							break;
						case 'deleteObjective':
							await this.objectiveStore.deleteObjective(message.id, currentBranch);
							this.update();
							break;
						case 'setScope':
							this.treeDataProvider.setScope(message.scope as ScanScope);
							this.update();
							break;
						case 'refresh':
							this.update();
							this.treeDataProvider.refresh();
							break;
						case 'copyAsMarkdown':
							vscode.commands.executeCommand('gbts.copyAsMarkdown');
							break;
						case 'insertTodo':
							vscode.commands.executeCommand('gbts.insertTodoComment');
							break;
						case 'openSettings':
							vscode.commands.executeCommand('gbts.openSettings');
							break;
					}
				},
				null,
				this._disposables
			)
		);

		// Initial trigger
		this.update();
	}

	public debouncedUpdate(delayMs: number = 200) {
		if (this._debounceTimer) {
			clearTimeout(this._debounceTimer);
		}
		this._debounceTimer = setTimeout(() => {
			this.update();
		}, delayMs);
	}

	public async update() {
		const cwd = this.gitService.getWorkspaceRoot();
		if (!cwd) return;

		const currentBranch = this.gitService.getCurrentBranch();
		const scope = this.treeDataProvider.getScope();
		const config = vscode.workspace.getConfiguration('gbts');
		const gbtsConfig: GbtsConfiguration = {
			todoPrefixes: config.get<string[]>('todoPrefixes', [
				'TODO',
				'FIXME',
				'NOTE',
				'HACK',
				'BUG',
				'XXX',
				'REVIEW'
			]),
			baseBranch: config.get<string>('baseBranch', ''),
			includeUncommitted: config.get<boolean>('includeUncommitted', true),
			groupBy: config.get<GroupMode>('groupBy', 'file'),
			defaultScope: scope,
			showGutterDecorations: config.get<boolean>('showGutterDecorations', true)
		};

		try {
			const [scanResult, objectives] = await Promise.all([
				this.scanner.scanTodos(cwd, currentBranch, scope, gbtsConfig),
				this.objectiveStore.getObjectives(currentBranch)
			]);

			this._panel.webview.postMessage({
				type: 'state',
				currentBranch,
				baseBranch: scanResult.baseBranch,
				scope,
				objectives: objectives || [],
				todos: scanResult.todos || [],
				prefixes: gbtsConfig.todoPrefixes
			});
		} catch (err) {
			console.error('[GBTS] Error updating webview panel:', err);
		}
	}

	private _updateHtml() {
		this._panel.title = 'Branch Tasks';
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git Branch Tasks</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --card-bg: var(--vscode-editorWidget-background, #1e1e1e);
      --card-border: var(--vscode-editorWidget-border, #333333);
      --input-bg: var(--vscode-input-background, #2d2d2d);
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --input-border: var(--vscode-input-border, #3c3c3c);
      --btn-bg: var(--vscode-button-background, #0e639c);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #ffffff);
      --hover-bg: var(--vscode-list-hoverBackground, #2a2d2e);
      --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-family);
      background-color: var(--bg);
      color: var(--fg);
      padding: 16px;
      line-height: 1.4;
      font-size: 13px;
    }

    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 12px;
    }

    .branch-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .branch-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--btn-bg);
      color: var(--btn-fg);
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
    }

    .base-badge {
      background: var(--badge-bg);
      color: var(--badge-fg);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      opacity: 0.9;
    }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    button {
      background: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }

    button:hover {
      background: var(--btn-hover);
    }

    button.secondary {
      background: var(--card-border);
      color: var(--fg);
    }
    button.secondary:hover {
      background: var(--input-border);
    }

    .scope-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      background: rgba(0,0,0,0.15);
      padding: 4px;
      border-radius: 6px;
      border: 1px solid var(--card-border);
      flex-wrap: wrap;
    }

    .scope-tab {
      padding: 5px 12px;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--fg);
      opacity: 0.8;
      user-select: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .scope-tab:hover {
      opacity: 1;
      background: var(--hover-bg);
    }

    .scope-tab.active {
      opacity: 1;
      background: var(--btn-bg);
      color: var(--btn-fg);
      font-weight: 600;
    }

    /* Objectives section */
    .objectives-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
    }

    .section-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .add-objective-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .add-objective-input {
      flex: 1;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
    }
    .add-objective-input:focus {
      border-color: var(--btn-bg);
    }

    .objective-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .objective-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--card-border);
      border-radius: 4px;
      transition: background 0.15s ease;
    }
    .objective-item:hover {
      background: var(--hover-bg);
    }

    .objective-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      cursor: pointer;
    }

    .objective-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--btn-bg);
    }

    .objective-text {
      font-size: 13px;
      transition: all 0.15s ease;
    }

    .objective-text.completed {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: var(--fg);
      opacity: 0.5;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .delete-btn:hover {
      opacity: 1;
      background: rgba(220, 38, 38, 0.2);
      color: #ef4444;
    }

    /* Filter & Code TODOs */
    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--btn-bg);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--fg);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }

    .chip:hover {
      background: var(--hover-bg);
    }

    .chip.active {
      background: var(--btn-bg);
      color: var(--btn-fg);
      border-color: var(--btn-bg);
      font-weight: 600;
    }

    .file-group {
      margin-bottom: 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .file-header {
      padding: 8px 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .task-list {
      display: flex;
      flex-direction: column;
    }

    .task-card {
      padding: 10px 12px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .task-card:last-child {
      border-bottom: none;
    }

    .task-card:hover {
      background: var(--hover-bg);
    }

    .task-top {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .prefix-tag {
      font-weight: 700;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .prefix-TODO { background: #d97706; color: #fff; }
    .prefix-FIXME, .prefix-BUG { background: #dc2626; color: #fff; }
    .prefix-HACK, .prefix-XXX { background: #b45309; color: #fff; }
    .prefix-NOTE, .prefix-REVIEW { background: #2563eb; color: #fff; }

    .author-tag {
      font-size: 11px;
      color: #38bdf8;
      font-weight: 500;
    }

    .task-text {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
    }

    .task-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      opacity: 0.8;
    }

    .loc-badge {
      font-family: var(--vscode-editor-font-family, monospace);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .snippet {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      background: rgba(0, 0, 0, 0.25);
      padding: 6px 8px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      opacity: 0.85;
      margin-top: 2px;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: var(--fg);
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="branch-meta">
      <div class="branch-badge">
        <span>🌿</span> <span id="currentBranch">main</span>
      </div>
      <div class="base-badge" id="baseBranchContainer">vs <span id="baseBranch">main</span></div>
      <div class="base-badge" id="taskCounter">0 tasks</div>
    </div>
    <div class="actions">
      <button onclick="insertTodo()">➕ Comment</button>
      <button class="secondary" onclick="copyAsMarkdown()">📋 Copy PR</button>
      <button class="secondary" onclick="refresh()">🔄 Refresh</button>
    </div>
  </div>

  <!-- Scope Switcher Bar -->
  <div class="scope-bar">
    <div class="scope-tab" id="scope-branch" onclick="selectScope('branch')">🌿 Branch Diff</div>
    <div class="scope-tab" id="scope-project" onclick="selectScope('project')">🌐 All Project</div>
    <div class="scope-tab" id="scope-unpushed" onclick="selectScope('unpushed')">🚀 Unpushed</div>
    <div class="scope-tab" id="scope-uncommitted" onclick="selectScope('uncommitted')">📝 Uncommitted</div>
  </div>

  <!-- Branch Objectives Section -->
  <div class="objectives-section">
    <div class="section-title">
      <span>📋 Branch Objectives</span>
      <span id="objectiveCounter" style="font-size: 11px; opacity: 0.8;">0/0 done</span>
    </div>
    <div class="add-objective-row">
      <input type="text" id="newObjectiveInput" class="add-objective-input" placeholder="Add custom branch task / objective (press Enter)..." onkeydown="onObjectiveKeyDown(event)" />
      <button onclick="addObjective()">Add</button>
    </div>
    <div class="objective-list" id="objectiveList"></div>
  </div>

  <!-- Code Comments Section -->
  <div class="filter-bar">
    <div style="font-weight: 600; font-size: 13px;">📌 Code Comments</div>
    <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search code comments by text, author, or file..." oninput="onFilterChange()" />
    <div class="chips" id="prefixChips"></div>
  </div>

  <div id="tasksContainer"></div>

  <script>
    const vscode = acquireVsCodeApi();
    let state = {
      currentBranch: 'main',
      baseBranch: 'main',
      scope: 'branch',
      objectives: [],
      todos: [],
      prefixes: ['TODO', 'FIXME', 'NOTE', 'HACK', 'BUG'],
      selectedPrefix: 'ALL',
      searchQuery: ''
    };

    // Listen for state messages from extension host
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'state') {
        state.currentBranch = msg.currentBranch;
        state.baseBranch = msg.baseBranch;
        state.scope = msg.scope || 'branch';
        state.objectives = msg.objectives || [];
        state.todos = msg.todos || [];
        state.prefixes = msg.prefixes || [];
        render();
      }
    });

    // Notify extension that webview is ready to receive state
    vscode.postMessage({ command: 'ready' });

    function render() {
      document.getElementById('currentBranch').textContent = state.currentBranch;
      document.getElementById('baseBranch').textContent = state.baseBranch;
      const totalTasks = state.objectives.length + state.todos.length;
      document.getElementById('taskCounter').textContent = totalTasks + ' total task' + (totalTasks === 1 ? '' : 's');

      ['branch', 'project', 'unpushed', 'uncommitted'].forEach(s => {
        const tab = document.getElementById('scope-' + s);
        if (tab) {
          if (s === state.scope) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        }
      });

      renderObjectives();
      renderChips();
      renderTasks();
    }

    function renderObjectives() {
      const container = document.getElementById('objectiveList');
      const counter = document.getElementById('objectiveCounter');
      const completed = state.objectives.filter(o => o.completed).length;
      counter.textContent = \`\${completed}/\${state.objectives.length} done\`;

      if (state.objectives.length === 0) {
        container.innerHTML = \`<div style="font-size: 12px; opacity: 0.6; padding: 4px 0;">No general objectives yet for this branch.</div>\`;
        return;
      }

      let html = '';
      state.objectives.forEach(obj => {
        html += \`
          <div class="objective-item">
            <div class="objective-left" onclick="toggleObjective('\${obj.id}')">
              <input type="checkbox" class="objective-checkbox" \${obj.completed ? 'checked' : ''} onclick="event.stopPropagation(); toggleObjective('\${obj.id}')" />
              <span class="objective-text \${obj.completed ? 'completed' : ''}">\${escapeHtml(obj.text)}</span>
            </div>
            <button class="delete-btn" onclick="deleteObjective('\${obj.id}')" title="Delete objective">🗑️</button>
          </div>
        \`;
      });

      container.innerHTML = html;
    }

    function onObjectiveKeyDown(e) {
      if (e.key === 'Enter') {
        addObjective();
      }
    }

    function addObjective() {
      const input = document.getElementById('newObjectiveInput');
      const text = input.value.trim();
      if (!text) return;
      vscode.postMessage({ command: 'addObjective', text });
      input.value = '';
    }

    function toggleObjective(id) {
      vscode.postMessage({ command: 'toggleObjective', id });
    }

    function deleteObjective(id) {
      vscode.postMessage({ command: 'deleteObjective', id });
    }

    function selectScope(newScope) {
      state.scope = newScope;
      render();
      vscode.postMessage({ command: 'setScope', scope: newScope });
    }

    function renderChips() {
      const chipsEl = document.getElementById('prefixChips');
      const counts = { ALL: state.todos.length };
      state.todos.forEach(t => {
        counts[t.prefix] = (counts[t.prefix] || 0) + 1;
      });

      let html = \`<div class="chip \${state.selectedPrefix === 'ALL' ? 'active' : ''}" onclick="selectChip('ALL')">All (\${counts.ALL})</div>\`;
      
      const allPrefixes = Array.from(new Set([...state.prefixes, ...state.todos.map(t => t.prefix)]));
      allPrefixes.forEach(p => {
        if (counts[p]) {
          html += \`<div class="chip \${state.selectedPrefix === p ? 'active' : ''}" onclick="selectChip('\${p}')">\${p} (\${counts[p]})</div>\`;
        }
      });

      chipsEl.innerHTML = html;
    }

    function selectChip(prefix) {
      state.selectedPrefix = prefix;
      renderChips();
      renderTasks();
    }

    function onFilterChange() {
      state.searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
      renderTasks();
    }

    function renderTasks() {
      const container = document.getElementById('tasksContainer');
      const filtered = state.todos.filter(t => {
        const matchesPrefix = state.selectedPrefix === 'ALL' || t.prefix === state.selectedPrefix;
        const matchesSearch = !state.searchQuery ||
          t.text.toLowerCase().includes(state.searchQuery) ||
          t.filePath.toLowerCase().includes(state.searchQuery) ||
          (t.author && t.author.toLowerCase().includes(state.searchQuery));
        return matchesPrefix && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <p style="font-size: 12px;">No code comments found under scope: \${state.scope}</p>
          </div>
        \`;
        return;
      }

      const fileMap = new Map();
      filtered.forEach(t => {
        const list = fileMap.get(t.filePath) || [];
        list.push(t);
        fileMap.set(t.filePath, list);
      });

      let html = '';
      fileMap.forEach((todos, filePath) => {
        html += \`
          <div class="file-group">
            <div class="file-header">
              <span>📄 \${escapeHtml(filePath)}</span>
              <span>\${todos.length} item\${todos.length === 1 ? '' : 's'}</span>
            </div>
            <div class="task-list">
        \`;

        todos.forEach(todo => {
          const prefixClass = 'prefix-' + todo.prefix.toUpperCase();
          html += \`
            <div class="task-card" onclick='jumpToLine(\${JSON.stringify(todo)})'>
              <div class="task-top">
                <span class="prefix-tag \${prefixClass}">\${escapeHtml(todo.prefix)}</span>
                \${todo.author ? \`<span class="author-tag">@\${escapeHtml(todo.author)}</span>\` : ''}
                <span class="task-text">\${escapeHtml(todo.text)}</span>
              </div>
              \${todo.rawLine ? \`<div class="snippet">\${escapeHtml(todo.rawLine)}</div>\` : ''}
              <div class="task-meta">
                <span class="loc-badge">Line \${todo.lineNumber}</span>
                \${todo.isUncommitted ? '<span style="color: #e5a440;">• uncommitted</span>' : ''}
              </div>
            </div>
          \`;
        });

        html += \`</div></div>\`;
      });

      container.innerHTML = html;
    }

    function jumpToLine(todo) {
      vscode.postMessage({ command: 'jumpToLine', todo });
    }

    function insertTodo() {
      vscode.postMessage({ command: 'insertTodo' });
    }

    function copyAsMarkdown() {
      vscode.postMessage({ command: 'copyAsMarkdown' });
    }

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;
	}

	public dispose() {
		if (this._debounceTimer) {
			clearTimeout(this._debounceTimer);
		}
		GbtsWebviewPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const d = this._disposables.pop();
			if (d) d.dispose();
		}
	}
}

export class GbtsWebviewSerializer implements vscode.WebviewPanelSerializer {
	constructor(
		private context: vscode.ExtensionContext,
		private treeDataProvider: BranchTodoTreeDataProvider,
		private objectiveStore: ObjectiveStore,
		private scanner: TodoScanner,
		private gitService: GitService
	) {}

	async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
		GbtsWebviewPanel.revive(
			webviewPanel,
			this.context,
			this.treeDataProvider,
			this.objectiveStore,
			this.scanner,
			this.gitService
		);
	}
}
