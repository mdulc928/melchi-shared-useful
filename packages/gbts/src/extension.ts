import * as vscode from 'vscode';
import { GitService } from './gitService';
import { TodoScanner } from './scanner';
import { ObjectiveStore } from './objectiveStore';
import { BranchTodoTreeDataProvider, ObjectiveTreeItem } from './treeDataProvider';
import { DecorationManager } from './decorationManager';
import { GbtsWebviewPanel, GbtsWebviewSerializer } from './webviewPanel';
import { TodoItem, BranchObjective, GroupMode, ScanScope } from './types';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('[GBTS] Git Branch Tasks v0.5.2 is activating...');

	const gitService = new GitService();
	const scanner = new TodoScanner();
	const objectiveStore = new ObjectiveStore(context);
	const treeDataProvider = new BranchTodoTreeDataProvider(scanner, objectiveStore, gitService);
	const decorationManager = new DecorationManager(context, treeDataProvider, gitService);

	// Register Webview Serializer for Window Reload & Floating Window Persistence
	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer(
			GbtsWebviewPanel.viewType,
			new GbtsWebviewSerializer(context, treeDataProvider, objectiveStore, scanner, gitService)
		)
	);

	// Register Tree View
	const treeView = vscode.window.createTreeView('gbts.taskExplorer', {
		treeDataProvider,
		showCollapseAll: true
	});

	// Command: Pop Out to Window / Editor Tab
	const popoutCmd = vscode.commands.registerCommand('gbts.popout', () => {
		GbtsWebviewPanel.createOrShow(context, treeDataProvider, objectiveStore, scanner, gitService);
	});

	// Command: Add General Branch Objective
	const addObjectiveCmd = vscode.commands.registerCommand('gbts.addObjective', async () => {
		const currentBranch = gitService.getCurrentBranch();
		const text = await vscode.window.showInputBox({
			prompt: `Add objective for branch "${currentBranch}"`,
			placeHolder: 'What is the goal / task for this branch?'
		});

		if (!text || text.trim().length === 0) return;

		await objectiveStore.addObjective(currentBranch, text.trim());
		vscode.window.setStatusBarMessage(`Added objective to "${currentBranch}"`, 2500);
	});

	// Command: Toggle Objective Completion
	const toggleObjectiveCmd = vscode.commands.registerCommand(
		'gbts.toggleObjective',
		async (item: ObjectiveTreeItem | BranchObjective) => {
			const obj = item instanceof ObjectiveTreeItem ? item.objective : item;
			if (!obj) return;

			const currentBranch = gitService.getCurrentBranch();
			const updated = await objectiveStore.toggleObjective(obj.id, currentBranch);
			if (updated) {
				const status = updated.completed ? 'completed' : 'reopened';
				vscode.window.setStatusBarMessage(`Objective marked as ${status}`, 2000);
			}
		}
	);

	// Command: Edit Objective
	const editObjectiveCmd = vscode.commands.registerCommand(
		'gbts.editObjective',
		async (item: ObjectiveTreeItem | BranchObjective) => {
			const obj = item instanceof ObjectiveTreeItem ? item.objective : item;
			if (!obj) return;

			const currentBranch = gitService.getCurrentBranch();
			const newText = await vscode.window.showInputBox({
				prompt: 'Edit objective text',
				value: obj.text
			});

			if (newText && newText.trim().length > 0 && newText.trim() !== obj.text) {
				await objectiveStore.updateObjective(obj.id, currentBranch, newText.trim());
				vscode.window.showInformationMessage('Objective updated.');
			}
		}
	);

	// Command: Delete Objective
	const deleteObjectiveCmd = vscode.commands.registerCommand(
		'gbts.deleteObjective',
		async (item: ObjectiveTreeItem | BranchObjective) => {
			const obj = item instanceof ObjectiveTreeItem ? item.objective : item;
			if (!obj) return;

			const currentBranch = gitService.getCurrentBranch();
			await objectiveStore.deleteObjective(obj.id, currentBranch);
			vscode.window.setStatusBarMessage('Objective deleted', 2000);
		}
	);

	// Command: Set Scope
	const setScopeCmd = vscode.commands.registerCommand('gbts.setScope', async () => {
		const currentScope = treeDataProvider.getScope();
		const items: Array<vscode.QuickPickItem & { scope: ScanScope }> = [
			{
				label: '🌿 Branch Diff',
				description: 'Tasks added on current branch vs base branch',
				picked: currentScope === 'branch',
				scope: 'branch'
			},
			{
				label: '🌐 All Project TODOs',
				description: 'All active TODO comments in the repository',
				picked: currentScope === 'project',
				scope: 'project'
			},
			{
				label: '🚀 Unpushed Commits',
				description: 'Tasks in local unpushed commits',
				picked: currentScope === 'unpushed',
				scope: 'unpushed'
			},
			{
				label: '📝 Uncommitted Only',
				description: 'Tasks in dirty/staged working tree files',
				picked: currentScope === 'uncommitted',
				scope: 'uncommitted'
			}
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select task scanning scope'
		});

		if (selected) {
			treeDataProvider.setScope(selected.scope);
			vscode.window.setStatusBarMessage(`[GBTS] Scope: ${selected.label}`, 2500);
		}
	});

	// Command: Jump to TODO
	const jumpToLineCmd = vscode.commands.registerCommand(
		'gbts.jumpToLine',
		async (todo: TodoItem) => {
			if (!todo.filePath) return;

			const workspaceRoot = gitService.getWorkspaceRoot();
			const absPath = workspaceRoot ? path.resolve(workspaceRoot, todo.filePath) : todo.filePath;

			try {
				const doc = await vscode.workspace.openTextDocument(absPath);
				const editor = await vscode.window.showTextDocument(doc, { preview: false });

				const line = Math.max(0, todo.lineNumber - 1);
				const col = Math.max(0, (todo.column || 1) - 1);
				const pos = new vscode.Position(line, col);
				editor.selection = new vscode.Selection(pos, pos);
				editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
			} catch (err) {
				vscode.window.showErrorMessage(`Could not open file "${todo.filePath}": ${err}`);
			}
		}
	);

	// Command: Insert TODO Comment at current line
	const insertTodoCmd = vscode.commands.registerCommand('gbts.insertTodoComment', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('Open a code file to insert a TODO comment.');
			return;
		}

		const config = vscode.workspace.getConfiguration('gbts');
		const prefixes = config.get<string[]>('todoPrefixes', ['TODO', 'FIXME', 'NOTE', 'HACK', 'BUG']);

		const selectedPrefix = await vscode.window.showQuickPick(prefixes, {
			placeHolder: 'Select TODO prefix'
		});

		if (!selectedPrefix) return;

		const text = await vscode.window.showInputBox({
			prompt: `Enter ${selectedPrefix} description`,
			placeHolder: 'What needs to be done?'
		});

		if (!text || text.trim().length === 0) return;

		const line = editor.selection.active.line;
		const lineText = editor.document.lineAt(line).text;
		const indentMatch = lineText.match(/^(\s*)/);
		const indent = indentMatch ? indentMatch[1] : '';

		const comment = `${indent}// ${selectedPrefix}: ${text.trim()}\n`;

		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(line, 0), comment);
		});

		vscode.window.setStatusBarMessage(`Inserted ${selectedPrefix} comment`, 2500);
	});

	// Command: Copy All Tasks as Markdown Checklist for PRs
	const copyAsMarkdownCmd = vscode.commands.registerCommand('gbts.copyAsMarkdown', async () => {
		const currentBranch = gitService.getCurrentBranch();
		const { baseBranch, scope, objectives, todos } = treeDataProvider.getCachedData();

		if (objectives.length === 0 && todos.length === 0) {
			vscode.window.showInformationMessage(`No tasks on branch "${currentBranch}" to copy.`);
			return;
		}

		let md = `### Branch Tasks for \`${currentBranch}\` (vs \`${baseBranch}\`)\n\n`;

		if (objectives.length > 0) {
			md += `#### 📋 Branch Objectives\n`;
			for (const obj of objectives) {
				md += `- [${obj.completed ? 'x' : ' '}] ${obj.text}\n`;
			}
			md += `\n`;
		}

		if (todos.length > 0) {
			md += `#### 📌 Code Comments (${scope})\n`;
			for (const todo of todos) {
				const author = todo.author ? ` (@${todo.author})` : '';
				const loc = `\`${todo.filePath}:${todo.lineNumber}\``;
				md += `- [ ] **[${todo.prefix}${author}]** ${todo.text} (${loc})\n`;
			}
		}

		await vscode.env.clipboard.writeText(md);
		vscode.window.showInformationMessage(`Copied task checklist to clipboard!`);
	});

	// Command: Toggle Grouping (file -> prefix -> flat -> file)
	const toggleGroupingCmd = vscode.commands.registerCommand('gbts.toggleGrouping', async () => {
		const config = vscode.workspace.getConfiguration('gbts');
		const current = config.get<GroupMode>('groupBy', 'file');

		const nextMode: GroupMode =
			current === 'file' ? 'prefix' : current === 'prefix' ? 'flat' : 'file';
		await config.update('groupBy', nextMode, vscode.ConfigurationTarget.Global);
		treeDataProvider.refresh();
		vscode.window.setStatusBarMessage(`Grouped by: ${nextMode}`, 2000);
	});

	// Command: Open Settings
	const openSettingsCmd = vscode.commands.registerCommand('gbts.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'gbts');
	});

	// Command: Refresh
	const refreshCmd = vscode.commands.registerCommand('gbts.refresh', () => {
		treeDataProvider.refresh();
	});

	context.subscriptions.push(
		gitService,
		objectiveStore,
		decorationManager,
		treeView,
		popoutCmd,
		addObjectiveCmd,
		toggleObjectiveCmd,
		editObjectiveCmd,
		deleteObjectiveCmd,
		setScopeCmd,
		jumpToLineCmd,
		insertTodoCmd,
		copyAsMarkdownCmd,
		toggleGroupingCmd,
		openSettingsCmd,
		refreshCmd
	);

	console.log('[GBTS] Git Branch Tasks activated successfully!');
}

export function deactivate() {}
