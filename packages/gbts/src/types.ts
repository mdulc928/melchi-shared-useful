export interface BranchObjective {
	id: string;
	branch: string;
	text: string;
	completed: boolean;
	createdAt: number;
	completedAt?: number;
}

export interface TodoItem {
	id: string;
	prefix: string; // e.g. "TODO", "FIXME", "NOTE", "HACK", "BUG"
	author?: string; // e.g. "mel" from TODO(mel):
	text: string; // e.g. "Refactor auth token logic"
	filePath: string; // Workspace-relative path
	lineNumber: number; // 1-indexed
	column: number; // 1-indexed
	rawLine: string; // Original line text
	isUncommitted: boolean; // true if from uncommitted/staged working tree edits
}

export type GroupMode = 'file' | 'prefix' | 'flat';
export type ScanScope = 'branch' | 'project' | 'unpushed' | 'uncommitted';

export interface GbtsConfiguration {
	todoPrefixes: string[];
	baseBranch: string;
	includeUncommitted: boolean;
	groupBy: GroupMode;
	defaultScope: ScanScope;
	showGutterDecorations: boolean;
}
