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

interface VintResult {
	length: number;
	value: number;
}

function readVint(u8: Uint8Array, offset: number): VintResult | null {
	const first = u8[offset];
	if (first === undefined || first === 0) return null;

	let length = 1;
	let mask = 0x80;
	while (length <= 8 && (first & mask) === 0) {
		mask >>= 1;
		length++;
	}
	if (length > 8) return null;
	if (offset + length > u8.length) return null;

	let value = first & (mask - 1);
	for (let i = 1; i < length; i++) {
		value = (value * 256) + (u8[offset + i] ?? 0);
	}
	return { length, value };
}

function findPattern(u8: Uint8Array, pattern: number[], from = 0, to = u8.length): number {
	const limit = Math.min(to, u8.length) - pattern.length + 1;
	for (let i = Math.max(0, from); i < limit; i++) {
		let matched = true;
		for (let j = 0; j < pattern.length; j++) {
			if (u8[i + j] !== pattern[j]) {
				matched = false;
				break;
			}
		}
		if (matched) return i;
	}
	return -1;
}

function readUnsignedBE(u8: Uint8Array, offset: number, byteLength: number): number {
	let value = 0;
	for (let i = 0; i < byteLength; i++) {
		value = (value * 256) + (u8[offset + i] ?? 0);
	}
	return value;
}

/**
 * Patch the Duration field in a MediaRecorder WebM blob.
 * MediaRecorder often writes Duration = 0, which prevents the audio
 * element's scrubber from working correctly.  This scans for the EBML
 * Duration element (ID 0x4489) and overwrites it with the real value.
 * Duration is stored in Segment timecode units, so we also read TimecodeScale.
 */
async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
	if (!blob.type.startsWith('audio/webm') || durationMs <= 0) return blob;
	try {
		const buf  = await blob.arrayBuffer();
		const u8   = new Uint8Array(buf);
		const view = new DataView(buf);

		// Search metadata only (before first Cluster) to avoid false positives.
		const firstCluster = findPattern(u8, [0x1f, 0x43, 0xb6, 0x75]);
		const searchEnd = firstCluster > 0 ? firstCluster : Math.min(u8.length, 1024 * 1024);

		// TimecodeScale (ID 0x2AD7B1) defaults to 1,000,000 ns if absent.
		let timecodeScaleNs = 1_000_000;
		const tcs = findPattern(u8, [0x2a, 0xd7, 0xb1], 0, searchEnd);
		if (tcs >= 0) {
			const sizeInfo = readVint(u8, tcs + 3);
			if (sizeInfo && sizeInfo.value > 0 && sizeInfo.value <= 8) {
				const dataOffset = tcs + 3 + sizeInfo.length;
				if (dataOffset + sizeInfo.value <= u8.length) {
					const parsed = readUnsignedBE(u8, dataOffset, sizeInfo.value);
					if (parsed > 0) timecodeScaleNs = parsed;
				}
			}
		}

		// Duration value must be in Segment timecode units.
		const durationInTimecodeUnits = durationMs * (1_000_000 / timecodeScaleNs);

		// Duration element (ID 0x4489), followed by VINT size and float payload.
		for (let i = 0; i < searchEnd - 2; i++) {
			if (u8[i] !== 0x44 || u8[i + 1] !== 0x89) continue;
			const sizeInfo = readVint(u8, i + 2);
			if (!sizeInfo) continue;

			const dataOffset = i + 2 + sizeInfo.length;
			if (dataOffset + sizeInfo.value > u8.length) continue;

			if (sizeInfo.value === 8) {
				view.setFloat64(dataOffset, durationInTimecodeUnits, false);
				return new Blob([buf], { type: blob.type });
			}
			if (sizeInfo.value === 4) {
				view.setFloat32(dataOffset, durationInTimecodeUnits, false);
				return new Blob([buf], { type: blob.type });
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
