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

/**
 * Patch the Duration field in a MediaRecorder WebM blob.
 * MediaRecorder often writes Duration = 0, which prevents the audio
 * element's scrubber from working correctly.  This scans for the EBML
 * Duration element (ID 0x4489) and overwrites it with the real value.
 * Chrome's default timescale is 1 000 000 ns/tick → duration in milliseconds.
 */
async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
	if (!blob.type.startsWith('audio/webm') || durationMs <= 0) return blob;
	try {
		const buf  = await blob.arrayBuffer();
		const u8   = new Uint8Array(buf);
		const view = new DataView(buf);
		// Duration lives in the Segment > Info section near the start of the file.
		// Scan the first 4 KB to avoid false-matching audio data.
		const limit = Math.min(u8.length - 12, 4096);
		for (let i = 0; i < limit; i++) {
			if (u8[i] === 0x44 && u8[i + 1] === 0x89) {
				// 1-byte VINT sizes
				if (u8[i + 2] === 0x88) {             // size = 8 → float64
					view.setFloat64(i + 3, durationMs, false);
					return new Blob([buf], { type: blob.type });
				}
				if (u8[i + 2] === 0x84) {             // size = 4 → float32
					view.setFloat32(i + 3, durationMs, false);
					return new Blob([buf], { type: blob.type });
				}
				// 2-byte VINT sizes (some muxers use wider encoding)
				if (u8[i + 2] === 0x40 && u8[i + 3] === 0x08) {  // size = 8 → float64
					view.setFloat64(i + 4, durationMs, false);
					return new Blob([buf], { type: blob.type });
				}
				if (u8[i + 2] === 0x40 && u8[i + 3] === 0x04) {  // size = 4 → float32
					view.setFloat32(i + 4, durationMs, false);
					return new Blob([buf], { type: blob.type });
				}
			}
		}
	} catch {
		// If anything goes wrong, return the original blob unchanged.
	}
	return blob;
}

export interface SaveResult {
	audioPath: string;
	jsonPath:  string;
}

/**
 * Write the audio Blob and session JSON into the vault.
 * Creates the recordings folder if it does not already exist.
 * Patches WebM duration metadata so Obsidian's audio player scrubber works correctly.
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

	// Fix WebM duration before saving so the HTML audio element's scrubber reflects real time.
	const durationMs  = (sessionLog.summary?.totalDurationSeconds ?? 0) * 1000;
	const patchedBlob = await fixWebmDuration(blob, durationMs);

	const buf = await patchedBlob.arrayBuffer();
	await app.vault.createBinary(audioPath, buf);
	await app.vault.create(jsonPath, JSON.stringify(sessionLog, null, 2));

	return { audioPath, jsonPath };
}

/**
 * Atomically append a "LectureLight session" section to the currently active note.
 * The audio embed uses ![[...]] so Obsidian renders an inline player.
 * The session log uses [[...]] as a plain link.
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
	// Plain embeds — no list bullets so Obsidian renders the audio player inline.
	const section =
		`\n## LectureLight session — ${date}\n\n` +
		`![[${audioPath}]]\n\n` +
		`[[${jsonPath}]]\n`;

	await app.vault.process(activeFile, (content) => content + section);
}
