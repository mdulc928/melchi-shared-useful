import * as vscode from 'vscode';
import { BranchObjective } from './types';

export class ObjectiveStore implements vscode.Disposable {
	private _context: vscode.ExtensionContext;
	private _onDidChangeObjectives = new vscode.EventEmitter<string>();
	public readonly onDidChangeObjectives: vscode.Event<string> = this._onDidChangeObjectives.event;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
	}

	public async getObjectives(branch: string): Promise<BranchObjective[]> {
		const all = this._context.workspaceState.get<Record<string, BranchObjective[]>>(
			'gbts.branchObjectives',
			{}
		);
		return all[branch] || [];
	}

	public async saveObjectives(branch: string, items: BranchObjective[]): Promise<void> {
		const all = this._context.workspaceState.get<Record<string, BranchObjective[]>>(
			'gbts.branchObjectives',
			{}
		);
		all[branch] = items;
		await this._context.workspaceState.update('gbts.branchObjectives', all);
		this._onDidChangeObjectives.fire(branch);
	}

	public async addObjective(branch: string, text: string): Promise<BranchObjective> {
		const list = await this.getObjectives(branch);
		const item: BranchObjective = {
			id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
			branch,
			text: text.trim(),
			completed: false,
			createdAt: Date.now()
		};

		list.unshift(item);
		await this.saveObjectives(branch, list);
		return item;
	}

	public async toggleObjective(id: string, branch: string): Promise<BranchObjective | undefined> {
		const list = await this.getObjectives(branch);
		const target = list.find((o) => o.id === id);
		if (!target) return undefined;

		target.completed = !target.completed;
		target.completedAt = target.completed ? Date.now() : undefined;

		await this.saveObjectives(branch, list);
		return target;
	}

	public async updateObjective(id: string, branch: string, newText: string): Promise<void> {
		const list = await this.getObjectives(branch);
		const target = list.find((o) => o.id === id);
		if (!target) return;

		target.text = newText.trim();
		await this.saveObjectives(branch, list);
	}

	public async deleteObjective(id: string, branch: string): Promise<void> {
		let list = await this.getObjectives(branch);
		list = list.filter((o) => o.id !== id);
		await this.saveObjectives(branch, list);
	}

	public async clearCompleted(branch: string): Promise<number> {
		const list = await this.getObjectives(branch);
		const remaining = list.filter((o) => !o.completed);
		const removedCount = list.length - remaining.length;
		if (removedCount > 0) {
			await this.saveObjectives(branch, remaining);
		}
		return removedCount;
	}

	dispose() {
		this._onDidChangeObjectives.dispose();
	}
}
