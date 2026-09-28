import * as vscode from 'vscode';
import { BranchTodoTreeDataProvider } from './treeDataProvider';
import { GitService } from './gitService';
import * as path from 'path';

export class DecorationManager implements vscode.Disposable {
	private _todoDecorationType: vscode.TextEditorDecorationType;
	private _fixmeDecorationType: vscode.TextEditorDecorationType;
	private _disposables: vscode.Disposable[] = [];

	constructor(
		private context: vscode.ExtensionContext,
		private treeDataProvider: BranchTodoTreeDataProvider,
		private gitService: GitService
	) {
		const pinIconPath = vscode.Uri.file(this.context.asAbsolutePath(path.join('media', 'pin.svg')));
		const checkIconPath = vscode.Uri.file(
			this.context.asAbsolutePath(path.join('media', 'check.svg'))
		);

		this._todoDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: pinIconPath,
			gutterIconSize: 'contain',
			overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.warningForeground'),
			overviewRulerLane: vscode.OverviewRulerLane.Right
		});

		this._fixmeDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: pinIconPath,
			gutterIconSize: 'contain',
			overviewRulerColor: new vscode.ThemeColor('problemsErrorIcon.foreground'),
			overviewRulerLane: vscode.OverviewRulerLane.Right
		});

		this._disposables.push(
			vscode.window.onDidChangeActiveTextEditor(() => this.updateDecorations()),
			vscode.workspace.onDidChangeTextDocument((e) => {
				if (vscode.window.activeTextEditor?.document === e.document) {
					this.updateDecorations();
				}
			}),
			treeDataProvider.onDidChangeTreeData(() => this.updateDecorations())
		);

		this.updateDecorations();
	}

	public updateDecorations(): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const config = vscode.workspace.getConfiguration('gbts');
		const enabled = config.get<boolean>('showGutterDecorations', true);

		if (!enabled) {
			editor.setDecorations(this._todoDecorationType, []);
			editor.setDecorations(this._fixmeDecorationType, []);
			return;
		}

		const { todos } = this.treeDataProvider.getCachedData();
		const workspaceRoot = this.gitService.getWorkspaceRoot();
		const currentDocPath = editor.document.uri.fsPath;

		const todoDecorations: vscode.DecorationOptions[] = [];
		const fixmeDecorations: vscode.DecorationOptions[] = [];

		for (const todo of todos) {
			let matches = false;
			if (workspaceRoot) {
				const absPath = path.resolve(workspaceRoot, todo.filePath);
				matches = absPath === currentDocPath;
			} else {
				matches = currentDocPath.endsWith(todo.filePath);
			}

			if (matches) {
				const lineIdx = Math.max(0, todo.lineNumber - 1);
				if (lineIdx < editor.document.lineCount) {
					const line = editor.document.lineAt(lineIdx);
					const isWarning = ['FIXME', 'BUG', 'HACK', 'XXX'].includes(todo.prefix.toUpperCase());

					const decoration: vscode.DecorationOptions = {
						range: new vscode.Range(lineIdx, 0, lineIdx, line.text.length),
						hoverMessage: new vscode.MarkdownString(
							`**[GBTS ${todo.prefix}${todo.author ? `(${todo.author})` : ''}]** ${todo.text}\n\n*Added on branch*`
						)
					};

					if (isWarning) {
						fixmeDecorations.push(decoration);
					} else {
						todoDecorations.push(decoration);
					}
				}
			}
		}

		editor.setDecorations(this._todoDecorationType, todoDecorations);
		editor.setDecorations(this._fixmeDecorationType, fixmeDecorations);
	}

	dispose() {
		this._todoDecorationType.dispose();
		this._fixmeDecorationType.dispose();
		for (const d of this._disposables) {
			d.dispose();
		}
		this._disposables = [];
	}
}
