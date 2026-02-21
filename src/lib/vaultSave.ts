import { App, normalizePath } from 'obsidian';
import type { SessionLog } from './logger';

const DEFAULT_RECORDINGS_FOLDER = 'LectureLight/Recordings';

/** Strip characters that are illegal in vault filenames across platforms. */
function sanitizeFilename(name: string): string {
	return name
		.replace(/[/\\:*?"<>|#%^{}[\]~`]/g, '-')
		.replace(/-{2,}/g, '-')
		.trim() || 'untitled';
}

/** Format: YYYY-MM-DD-HHmmss */
function formatDateStamp(date: Date): string {
	const p = (n: number, w = 2) => String(n).padStart(w, '0');
	return (
		`${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
		`-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
	);
}

function mimeToExt(mimeType: string): string {
	if (mimeType.startsWith('audio/mp4'))  return 'm4a';
	if (mimeType.startsWith('audio/ogg'))  return 'ogg';
	return 'webm';
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	if (!app.vault.getAbstractFileByPath(normalized)) {
		await app.vault.createFolder(normalized);
	}
}

export interface SaveResult {
	audioPath: string;
	jsonPath:  string;
}

/**
 * Write the audio Blob and session JSON into the vault.
 * Creates the recordings folder if it does not already exist.
 * Returns the vault-relative paths of both saved files.
 */
export async function saveRecording(
	app:             App,
	blob:            Blob,
	sessionLog:      SessionLog,
	noteTitle:       string,
	mimeType:        string,
	recordingFolder: string = DEFAULT_RECORDINGS_FOLDER,
): Promise<SaveResult> {
	const folder = normalizePath(recordingFolder);
	await ensureFolder(app, folder);

	const safeName  = sanitizeFilename(noteTitle);
	const stamp     = formatDateStamp(new Date(sessionLog.startTime));
	const ext       = mimeToExt(mimeType);
	const audioPath = normalizePath(`${folder}/${safeName}-${stamp}.${ext}`);
	const jsonPath  = normalizePath(`${folder}/${safeName}-${stamp}.session.json`);

	const buf = await blob.arrayBuffer();
	await app.vault.createBinary(audioPath, buf);
	await app.vault.create(jsonPath, JSON.stringify(sessionLog, null, 2));

	return { audioPath, jsonPath };
}

/**
 * Atomically append a "LectureLight session" section to the currently active note,
 * containing Obsidian links to the saved audio and session JSON.
 */
export async function appendSessionLinks(
	app:       App,
	audioPath: string,
	jsonPath:  string,
	startTime: string,
): Promise<void> {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) return;

	const date = new Date(startTime).toLocaleDateString('en-US', {
		year: 'numeric', month: 'long', day: 'numeric',
	});
	const section =
		`\n## LectureLight session — ${date}\n\n` +
		`- ![[${audioPath}]]\n` +
		`- [[${jsonPath}]]\n`;

	await app.vault.process(activeFile, (content) => content + section);
}
