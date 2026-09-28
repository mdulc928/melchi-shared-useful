import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { TodoItem, GbtsConfiguration, ScanScope } from './types';
import * as path from 'path';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

// Extensions to ignore during untracked file scanning to prevent memory bloat
const IGNORED_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.svg',
	'.ico',
	'.webp',
	'.avif',
	'.mp4',
	'.mov',
	'.webm',
	'.mp3',
	'.wav',
	'.ogg',
	'.zip',
	'.tar',
	'.gz',
	'.7z',
	'.rar',
	'.pdf',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	'.ppt',
	'.pptx',
	'.bin',
	'.exe',
	'.dll',
	'.so',
	'.dylib',
	'.wasm',
	'.map',
	'.min.js',
	'.min.css',
	'.lock',
	'.sqlite',
	'.db'
]);

const MAX_UNTRACKED_FILE_BYTES = 1024 * 1024; // 1 MB limit per untracked file

export class TodoScanner {
	private _isScanning: boolean = false;

	private async execGit(args: string[], cwd: string): Promise<string> {
		try {
			const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 15 * 1024 * 1024 });
			return stdout.trim();
		} catch (err: any) {
			return '';
		}
	}

	public async detectBaseBranch(cwd: string, configuredBase?: string): Promise<string> {
		if (configuredBase && configuredBase.trim().length > 0) {
			const trimmed = configuredBase.trim();
			const check = await this.execGit(['rev-parse', '--verify', trimmed], cwd);
			if (check) return trimmed;
		}

		const originHead = await this.execGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
		if (originHead) {
			const match = originHead.match(/refs\/remotes\/origin\/(.+)$/);
			if (match && match[1]) {
				return match[1];
			}
		}

		const candidates = [
			'main',
			'master',
			'origin/main',
			'origin/master',
			'develop',
			'origin/develop'
		];
		for (const candidate of candidates) {
			const check = await this.execGit(['rev-parse', '--verify', candidate], cwd);
			if (check) {
				return candidate.replace('origin/', '');
			}
		}

		return 'main';
	}

	public buildRegex(prefixes: string[]): RegExp {
		const escaped = prefixes
			.filter((p) => p && p.trim().length > 0)
			.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join('|');

		if (!escaped) {
			return /(?:(?:\/\/|#|--|;|%|\/\*+|<!--|\*)\s*|^[\s*]*)(?<prefix>TODO|FIXME)(?:\((?<author>[^)]+)\))?(?:\s*:\s*|\s+-\s*|\s+)(?<text>.*)/i;
		}

		return new RegExp(
			`(?:(?:\\/\\/|#|--|;|%|\\/\\*+|<!--|\\*)\\s*|^[\\s*]*)(?<prefix>${escaped})(?:\\((?<author>[^)]+)\\))?(?:\\s*:\\s*|\\s+-\\s*|\\s+)(?<text>[^\\r\\n]+)`,
			'i'
		);
	}

	private cleanCommentText(text: string): string {
		return text.replace(/\s*(\*\/|-->)\s*$/, '').trim();
	}

	public async scanTodos(
		cwd: string,
		currentBranch: string,
		scope: ScanScope,
		config: GbtsConfiguration
	): Promise<{ baseBranch: string; scope: ScanScope; todos: TodoItem[] }> {
		const baseBranch = await this.detectBaseBranch(cwd, config.baseBranch);
		const regex = this.buildRegex(config.todoPrefixes);
		const todos: TodoItem[] = [];
		const seenMap = new Set<string>();

		const parseUnifiedDiff = (diffText: string, isUncommitted: boolean) => {
			if (!diffText) return;

			const lines = diffText.split('\n');
			let currentFile = '';
			let currentLineNumber = 0;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				if (line.startsWith('diff --git ')) {
					const match = line.match(/diff --git a\/.* b\/(.*)$/);
					currentFile = match ? match[1] : '';
					currentLineNumber = 0;
					continue;
				}

				if (line.startsWith('+++ b/')) {
					currentFile = line.substring(6).trim();
					continue;
				}

				if (line.startsWith('@@ ')) {
					const match = line.match(/@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
					if (match) {
						currentLineNumber = parseInt(match[1], 10);
					}
					continue;
				}

				if (line.startsWith('+') && !line.startsWith('+++')) {
					const addedContent = line.substring(1);
					const match = addedContent.match(regex);

					if (match && match.groups) {
						const prefix = (match.groups.prefix || 'TODO').toUpperCase();
						const author = match.groups.author?.trim();
						const text = this.cleanCommentText(match.groups.text || '');

						if (text.length > 0 && currentFile && currentFile !== '/dev/null') {
							const uniqueKey = `${currentFile}:${currentLineNumber}:${prefix}:${text}`;
							if (!seenMap.has(uniqueKey)) {
								seenMap.add(uniqueKey);
								todos.push({
									id: `${currentFile}:${currentLineNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
									prefix,
									author,
									text,
									filePath: currentFile,
									lineNumber: currentLineNumber,
									column: 1,
									rawLine: addedContent.trim(),
									isUncommitted
								});
							}
						}
					}
					currentLineNumber++;
				} else if (line.startsWith(' ')) {
					currentLineNumber++;
				}
			}
		};

		try {
			if (scope === 'project') {
				const grepPattern = config.todoPrefixes.join('|');
				const grepOutput = await this.execGit(['grep', '-n', '-I', '-E', grepPattern], cwd);

				if (grepOutput) {
					const lines = grepOutput.split('\n');
					for (const line of lines) {
						const firstColon = line.indexOf(':');
						if (firstColon === -1) continue;
						const secondColon = line.indexOf(':', firstColon + 1);
						if (secondColon === -1) continue;

						const filePath = line.substring(0, firstColon);
						const lineNum = parseInt(line.substring(firstColon + 1, secondColon), 10);
						const content = line.substring(secondColon + 1);

						const match = content.match(regex);
						if (match && match.groups) {
							const prefix = (match.groups.prefix || 'TODO').toUpperCase();
							const author = match.groups.author?.trim();
							const text = this.cleanCommentText(match.groups.text || '');

							if (text.length > 0) {
								todos.push({
									id: `${filePath}:${lineNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
									prefix,
									author,
									text,
									filePath,
									lineNumber: lineNum,
									column: 1,
									rawLine: content.trim(),
									isUncommitted: false
								});
							}
						}
					}
				}
			} else if (scope === 'unpushed') {
				const upstream = await this.execGit(['rev-parse', '--abbrev-ref', '@{upstream}'], cwd);
				let unpushedDiff = '';
				if (upstream) {
					unpushedDiff = await this.execGit(['diff', '-U0', `${upstream}..HEAD`], cwd);
				} else {
					const originCheck = await this.execGit(
						['rev-parse', '--verify', `origin/${currentBranch}`],
						cwd
					);
					if (originCheck) {
						unpushedDiff = await this.execGit(
							['diff', '-U0', `origin/${currentBranch}..HEAD`],
							cwd
						);
					} else {
						unpushedDiff = await this.execGit(['diff', '-U0', `${baseBranch}..HEAD`], cwd);
					}
				}
				parseUnifiedDiff(unpushedDiff, false);

				if (config.includeUncommitted) {
					const uncommittedDiff = await this.execGit(['diff', '-U0', 'HEAD'], cwd);
					parseUnifiedDiff(uncommittedDiff, true);
				}
			} else if (scope === 'uncommitted') {
				const uncommittedDiff = await this.execGit(['diff', '-U0', 'HEAD'], cwd);
				parseUnifiedDiff(uncommittedDiff, true);
			} else {
				// Default: 'branch' diff
				if (currentBranch !== baseBranch) {
					const mergeBase = await this.execGit(['merge-base', baseBranch, 'HEAD'], cwd);
					if (mergeBase) {
						const branchDiff = await this.execGit(['diff', '-U0', `${mergeBase}..HEAD`], cwd);
						parseUnifiedDiff(branchDiff, false);
					} else {
						const branchDiff = await this.execGit(['diff', '-U0', `${baseBranch}...HEAD`], cwd);
						parseUnifiedDiff(branchDiff, false);
					}
				} else {
					const upstream = await this.execGit(['rev-parse', '--abbrev-ref', '@{upstream}'], cwd);
					if (upstream) {
						const unpushedDiff = await this.execGit(['diff', '-U0', `${upstream}..HEAD`], cwd);
						parseUnifiedDiff(unpushedDiff, false);
					}
				}

				if (config.includeUncommitted) {
					const uncommittedDiff = await this.execGit(['diff', '-U0', 'HEAD'], cwd);
					parseUnifiedDiff(uncommittedDiff, true);
				}
			}

			// Memory-safe untracked files scanner
			if (scope !== 'project' && config.includeUncommitted) {
				const untrackedList = await this.execGit(
					['ls-files', '--others', '--exclude-standard'],
					cwd
				);
				if (untrackedList) {
					const untrackedFiles = untrackedList.split('\n').filter((f) => f.trim().length > 0);
					for (const file of untrackedFiles) {
						const ext = path.extname(file).toLowerCase();
						if (IGNORED_EXTENSIONS.has(ext)) {
							continue; // Skip non-code and binary files
						}

						try {
							const fullPath = path.resolve(cwd, file);
							const stat = await fs.promises.stat(fullPath);
							if (stat.size > MAX_UNTRACKED_FILE_BYTES) {
								continue; // Skip files larger than 1MB to prevent RAM bloat
							}

							const content = await fs.promises.readFile(fullPath, 'utf8');
							const lines = content.split('\n');
							for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
								const lineContent = lines[lineIdx];
								const match = lineContent.match(regex);
								if (match && match.groups) {
									const prefix = (match.groups.prefix || 'TODO').toUpperCase();
									const author = match.groups.author?.trim();
									const text = this.cleanCommentText(match.groups.text || '');
									if (text.length > 0) {
										todos.push({
											id: `${file}:${lineIdx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
											prefix,
											author,
											text,
											filePath: file,
											lineNumber: lineIdx + 1,
											column: 1,
											rawLine: lineContent.trim(),
											isUncommitted: true
										});
									}
								}
							}
						} catch {
							// Ignore unreadable files
						}
					}
				}
			}
		} catch (err) {
			console.error('[GBTS] Error in scanTodos:', err);
		}

		return { baseBranch, scope, todos };
	}
}
