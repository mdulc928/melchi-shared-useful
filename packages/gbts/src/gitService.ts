import * as vscode from 'vscode';

export interface GitRepository {
	rootUri: vscode.Uri;
	state: {
		HEAD?: {
			name?: string;
			commit?: string;
		};
		onDidChange: vscode.Event<void>;
	};
}

export interface GitAPI {
	repositories: GitRepository[];
	onDidOpenRepository: vscode.Event<GitRepository>;
	onDidChangeState: vscode.Event<void>;
}

export class GitService implements vscode.Disposable {
	private _gitApi: GitAPI | undefined;
	private _currentBranch: string = 'main';
	private _disposables: vscode.Disposable[] = [];
	private _onDidChange = new vscode.EventEmitter<void>();

	public readonly onDidChange: vscode.Event<void> = this._onDidChange.event;

	constructor() {
		this.init();

		// Listen to document saves and config changes
		this._disposables.push(
			vscode.workspace.onDidSaveTextDocument(() => {
				this._onDidChange.fire();
			}),
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('gbts')) {
					this._onDidChange.fire();
				}
			})
		);
	}

	private async init() {
		try {
			const gitExtension = vscode.extensions.getExtension('vscode.git');
			if (!gitExtension) return;

			if (!gitExtension.isActive) {
				await gitExtension.activate();
			}

			this._gitApi = gitExtension.exports.getAPI(1);
			if (!this._gitApi) return;

			if (this._gitApi.repositories.length > 0) {
				this.trackRepository(this._gitApi.repositories[0]);
			}

			this._disposables.push(
				this._gitApi.onDidOpenRepository((repo) => {
					this.trackRepository(repo);
				})
			);
		} catch (err) {
			console.error('[GBTS] Failed to connect to Git extension:', err);
		}
	}

	private trackRepository(repo: GitRepository) {
		this.updateBranch(repo);

		this._disposables.push(
			repo.state.onDidChange(() => {
				this.updateBranch(repo);
				this._onDidChange.fire();
			})
		);
	}

	private updateBranch(repo: GitRepository) {
		const head = repo.state.HEAD;
		const branchName = head?.name || (head?.commit ? head.commit.substring(0, 7) : 'main');

		if (this._currentBranch !== branchName) {
			this._currentBranch = branchName;
			this._onDidChange.fire();
		}
	}

	public getCurrentBranch(): string {
		if (this._gitApi && this._gitApi.repositories.length > 0) {
			const repo = this._gitApi.repositories[0];
			const head = repo.state.HEAD;
			return head?.name || (head?.commit ? head.commit.substring(0, 7) : 'main');
		}
		return this._currentBranch;
	}

	public getWorkspaceRoot(): string | undefined {
		if (this._gitApi && this._gitApi.repositories.length > 0) {
			return this._gitApi.repositories[0].rootUri.fsPath;
		}
		return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	}

	dispose() {
		this._onDidChange.dispose();
		for (const d of this._disposables) {
			d.dispose();
		}
		this._disposables = [];
	}
}
