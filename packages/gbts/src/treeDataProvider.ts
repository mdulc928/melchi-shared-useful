import * as vscode from 'vscode';
import { TodoItem, BranchObjective, GroupMode, GbtsConfiguration, ScanScope } from './types';
import { TodoScanner } from './scanner';
import { GitService } from './gitService';
import { ObjectiveStore } from './objectiveStore';
import * as path from 'path';

export type TreeElement =
	| BranchHeaderItem
	| ObjectivesSectionItem
	| ObjectiveTreeItem
	| CodeTodosSectionItem
	| GroupTreeItem
	| TodoTreeItem
	| EmptyStateItem;

export class BranchHeaderItem extends vscode.TreeItem {
	constructor(
		branch: string,
		baseBranch: string,
		scope: ScanScope,
		objectivesCount: number,
		todosCount: number
	) {
		let title = `Branch: ${branch}`;
		let sub = '';

		const total = objectivesCount + todosCount;

		switch (scope) {
			case 'project':
				title = `🌐 All Project TODOs`;
				sub = `(${total} item${total === 1 ? '' : 's'})`;
				break;
			case 'unpushed':
				title = `🚀 Unpushed: ${branch}`;
				sub = `(${total} item${total === 1 ? '' : 's'})`;
				break;
			case 'uncommitted':
				title = `📝 Uncommitted: ${branch}`;
				sub = `(${total} item${total === 1 ? '' : 's'})`;
				break;
			default:
				title = `🌿 Branch: ${branch}`;
				sub = `vs ${baseBranch} (${total} item${total === 1 ? '' : 's'})`;
				break;
		}

		super(title, vscode.TreeItemCollapsibleState.None);
		this.description = sub;
		this.iconPath =
			scope === 'project' ? new vscode.ThemeIcon('globe') : new vscode.ThemeIcon('git-branch');
		this.contextValue = 'branchHeader';

		const md = new vscode.MarkdownString();
		md.appendMarkdown(`### **${title}**\n\n`);
		md.appendMarkdown(`- **Active Branch:** \`${branch}\`\n`);
		md.appendMarkdown(`- **Scope:** \`${scope}\`\n`);
		md.appendMarkdown(`- **Branch Objectives:** ${objectivesCount}\n`);
		md.appendMarkdown(`- **Code Comments:** ${todosCount}\n`);
		this.tooltip = md;
	}
}

export class ObjectivesSectionItem extends vscode.TreeItem {
	constructor(public readonly objectives: BranchObjective[]) {
		const completed = objectives.filter((o) => o.completed).length;
		super('📋 Branch Objectives', vscode.TreeItemCollapsibleState.Expanded);
		this.description = `${completed}/${objectives.length} done`;
		this.iconPath = new vscode.ThemeIcon('checklist');
		this.contextValue = 'objectivesSection';
		this.tooltip = `Branch Objectives: ${completed} of ${objectives.length} completed`;
	}
}

export class ObjectiveTreeItem extends vscode.TreeItem {
	constructor(public readonly objective: BranchObjective) {
		super(objective.text, vscode.TreeItemCollapsibleState.None);

		if (objective.completed) {
			this.iconPath = new vscode.ThemeIcon(
				'pass-filled',
				new vscode.ThemeColor('testing.iconPassed')
			);
			this.description = 'Done';
		} else {
			this.iconPath = new vscode.ThemeIcon('circle-large-outline');
			this.description = '';
		}

		this.contextValue = 'objectiveItem';
		this.tooltip = `${objective.completed ? '✅ Completed' : '⏳ Pending'}: ${objective.text}\nCreated: ${new Date(objective.createdAt).toLocaleDateString()}`;

		this.command = {
			command: 'gbts.toggleObjective',
			title: 'Toggle Objective',
			arguments: [objective]
		};
	}
}

export class CodeTodosSectionItem extends vscode.TreeItem {
	constructor(
		public readonly todos: TodoItem[],
		groupMode: GroupMode
	) {
		super('📌 Code Comments', vscode.TreeItemCollapsibleState.Expanded);
		this.description = `(${todos.length} item${todos.length === 1 ? '' : 's'})`;
		this.iconPath = new vscode.ThemeIcon('source-control');
		this.contextValue = 'codeTodosSection';
	}
}

export class GroupTreeItem extends vscode.TreeItem {
	constructor(
		public readonly groupKey: string,
		public readonly groupType: 'file' | 'prefix',
		public readonly todos: TodoItem[]
	) {
		super(
			groupType === 'file' ? path.basename(groupKey) : groupKey,
			vscode.TreeItemCollapsibleState.Expanded
		);

		if (groupType === 'file') {
			const dir = path.dirname(groupKey);
			this.description = `${dir !== '.' ? dir : ''} (${todos.length})`;
			this.iconPath = vscode.ThemeIcon.File;
			this.resourceUri = vscode.Uri.file(groupKey);
		} else {
			this.description = `(${todos.length})`;
			this.iconPath = getPrefixIcon(groupKey);
		}

		this.contextValue = 'groupItem';
	}
}

export class TodoTreeItem extends vscode.TreeItem {
	constructor(public readonly todo: TodoItem) {
		super(todo.text, vscode.TreeItemCollapsibleState.None);

		const tag = `[${todo.prefix}${todo.author ? `(${todo.author})` : ''}]`;
		const loc = `${path.basename(todo.filePath)}:${todo.lineNumber}`;
		const uncommittedTag = todo.isUncommitted ? ' • uncommitted' : '';

		this.description = `${tag} ${loc}${uncommittedTag}`;
		this.iconPath = getPrefixIcon(todo.prefix);
		this.contextValue = 'todoItem';

		const md = new vscode.MarkdownString();
		md.appendMarkdown(`### ${getPrefixEmoji(todo.prefix)} **${todo.prefix}**: ${todo.text}\n\n`);
		if (todo.author) {
			md.appendMarkdown(`- **Author:** \`@${todo.author}\`\n`);
		}
		md.appendMarkdown(`- **File:** \`${todo.filePath}:${todo.lineNumber}\`\n`);
		if (todo.isUncommitted) {
			md.appendMarkdown(`- **Status:** *Uncommitted / Local edits*\n`);
		}
		if (todo.rawLine) {
			md.appendMarkdown(`\n**Source Line:**\n\`\`\`\n${todo.rawLine}\n\`\`\`\n`);
		}
		this.tooltip = md;

		this.command = {
			command: 'gbts.jumpToLine',
			title: 'Jump to TODO',
			arguments: [todo]
		};
	}
}

export class EmptyStateItem extends vscode.TreeItem {
	constructor(branch: string, scope: ScanScope) {
		super(`No tasks for "${branch}"`, vscode.TreeItemCollapsibleState.None);
		this.description = `Scope: ${scope}`;
		this.iconPath = new vscode.ThemeIcon('check-all');
		this.contextValue = 'emptyState';
	}
}

function getPrefixIcon(prefix: string): vscode.ThemeIcon {
	const p = prefix.toUpperCase();
	if (p === 'FIXME' || p === 'BUG') {
		return new vscode.ThemeIcon('error', new vscode.ThemeColor('problemsErrorIcon.foreground'));
	}
	if (p === 'HACK' || p === 'XXX') {
		return new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
	}
	if (p === 'NOTE' || p === 'REVIEW') {
		return new vscode.ThemeIcon('info', new vscode.ThemeColor('problemsInfoIcon.foreground'));
	}
	return new vscode.ThemeIcon(
		'pin',
		new vscode.ThemeColor('editorOverviewRuler.warningForeground')
	);
}

function getPrefixEmoji(prefix: string): string {
	const p = prefix.toUpperCase();
	if (p === 'FIXME' || p === 'BUG') return '🚨';
	if (p === 'HACK' || p === 'XXX') return '⚠️';
	if (p === 'NOTE' || p === 'REVIEW') return '💡';
	return '📌';
}

export class BranchTodoTreeDataProvider implements vscode.TreeDataProvider<TreeElement> {
	private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private _cachedTodos: TodoItem[] = [];
	private _cachedObjectives: BranchObjective[] = [];
	private _cachedBaseBranch: string = 'main';
	private _currentScope: ScanScope = 'branch';

	constructor(
		private scanner: TodoScanner,
		private objectiveStore: ObjectiveStore,
		private gitService: GitService
	) {
		const config = vscode.workspace.getConfiguration('gbts');
		this._currentScope = config.get<ScanScope>('defaultScope', 'branch');

		gitService.onDidChange(() => this.refresh());
		objectiveStore.onDidChangeObjectives(() => this.refresh());
	}

	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	public setScope(scope: ScanScope): void {
		this._currentScope = scope;
		this.refresh();
	}

	public getScope(): ScanScope {
		return this._currentScope;
	}

	public getCachedData(): {
		baseBranch: string;
		scope: ScanScope;
		objectives: BranchObjective[];
		todos: TodoItem[];
	} {
		return {
			baseBranch: this._cachedBaseBranch,
			scope: this._currentScope,
			objectives: this._cachedObjectives,
			todos: this._cachedTodos
		};
	}

	public getTreeItem(element: TreeElement): vscode.TreeItem {
		return element;
	}

	public async getChildren(element?: TreeElement): Promise<TreeElement[]> {
		const cwd = this.gitService.getWorkspaceRoot();
		if (!cwd) {
			return [new EmptyStateItem('Workspace', this._currentScope)];
		}

		const currentBranch = this.gitService.getCurrentBranch();
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
			defaultScope: this._currentScope,
			showGutterDecorations: config.get<boolean>('showGutterDecorations', true)
		};

		if (!element) {
			const [scanResult, objectives] = await Promise.all([
				this.scanner.scanTodos(cwd, currentBranch, this._currentScope, gbtsConfig),
				this.objectiveStore.getObjectives(currentBranch)
			]);

			this._cachedTodos = scanResult.todos;
			this._cachedBaseBranch = scanResult.baseBranch;
			this._cachedObjectives = objectives;

			if (objectives.length === 0 && scanResult.todos.length === 0) {
				return [new EmptyStateItem(currentBranch, this._currentScope)];
			}

			const items: TreeElement[] = [
				new BranchHeaderItem(
					currentBranch,
					scanResult.baseBranch,
					this._currentScope,
					objectives.length,
					scanResult.todos.length
				)
			];

			// Objectives section (if any objectives exist)
			if (objectives.length > 0) {
				items.push(new ObjectivesSectionItem(objectives));
			}

			// Code comments section
			if (scanResult.todos.length > 0) {
				items.push(new CodeTodosSectionItem(scanResult.todos, gbtsConfig.groupBy));
			}

			return items;
		}

		// Children of Objectives section
		if (element instanceof ObjectivesSectionItem) {
			return element.objectives.map((obj) => new ObjectiveTreeItem(obj));
		}

		// Children of Code Comments section
		if (element instanceof CodeTodosSectionItem) {
			const config = vscode.workspace.getConfiguration('gbts');
			const groupBy = config.get<GroupMode>('groupBy', 'file');

			if (groupBy === 'flat') {
				return element.todos.map((t) => new TodoTreeItem(t));
			}

			if (groupBy === 'prefix') {
				const prefixMap = new Map<string, TodoItem[]>();
				for (const todo of element.todos) {
					const list = prefixMap.get(todo.prefix) || [];
					list.push(todo);
					prefixMap.set(todo.prefix, list);
				}
				const groups: TreeElement[] = [];
				for (const [prefixKey, prefixTodos] of prefixMap.entries()) {
					groups.push(new GroupTreeItem(prefixKey, 'prefix', prefixTodos));
				}
				return groups;
			}

			// Default: Group by file
			const fileMap = new Map<string, TodoItem[]>();
			for (const todo of element.todos) {
				const list = fileMap.get(todo.filePath) || [];
				list.push(todo);
				fileMap.set(todo.filePath, list);
			}
			const groups: TreeElement[] = [];
			for (const [filePath, fileTodos] of fileMap.entries()) {
				groups.push(new GroupTreeItem(filePath, 'file', fileTodos));
			}
			return groups;
		}

		if (element instanceof GroupTreeItem) {
			return element.todos.map((t) => new TodoTreeItem(t));
		}

		return [];
	}
}
