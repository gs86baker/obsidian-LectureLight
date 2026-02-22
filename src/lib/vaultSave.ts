import { App, TFile, normalizePath } from 'obsidian';
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

interface EbmlIdResult {
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

function readEbmlId(u8: Uint8Array, offset: number): EbmlIdResult | null {
	const first = u8[offset];
	if (first === undefined || first === 0) return null;

	let length = 1;
	let mask = 0x80;
	while (length <= 4 && (first & mask) === 0) {
		mask >>= 1;
		length++;
	}
	if (length > 4) return null;
	if (offset + length > u8.length) return null;

	let value = 0;
	for (let i = 0; i < length; i++) {
		value = (value * 256) + (u8[offset + i] ?? 0);
	}
	return { length, value };
}

function isUnknownSizeVint(u8: Uint8Array, offset: number, length: number): boolean {
	const first = u8[offset];
	if (first === undefined || length < 1 || length > 8) return false;
	let mask = 0x80;
	for (let i = 1; i < length; i++) mask >>= 1;
	const payloadMask = mask - 1;
	if ((first & payloadMask) !== payloadMask) return false;
	for (let i = 1; i < length; i++) {
		if (u8[offset + i] !== 0xff) return false;
	}
	return true;
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

function writeUnsignedBE(u8: Uint8Array, offset: number, byteLength: number, value: number): void {
	let v = Math.max(0, Math.floor(value));
	for (let i = byteLength - 1; i >= 0; i--) {
		u8[offset + i] = v & 0xff;
		v = Math.floor(v / 256);
	}
}

const CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];
const TIMECODE_ID = 0xe7;

function normalizeWebmClusterTimecodes(u8: Uint8Array): void {
	let cursor = 0;
	let baseClusterTimecode: number | null = null;

	while (cursor < u8.length) {
		const clusterStart = findPattern(u8, CLUSTER_ID, cursor);
		if (clusterStart < 0) break;

		const clusterSizeInfo = readVint(u8, clusterStart + CLUSTER_ID.length);
		if (!clusterSizeInfo) break;
		const clusterDataStart = clusterStart + CLUSTER_ID.length + clusterSizeInfo.length;
		if (clusterDataStart >= u8.length) break;

		const nextCluster = findPattern(u8, CLUSTER_ID, clusterDataStart);
		const hasUnknownSize = isUnknownSizeVint(u8, clusterStart + CLUSTER_ID.length, clusterSizeInfo.length);
		const declaredEnd = clusterDataStart + clusterSizeInfo.value;
		const clusterEnd = (
			hasUnknownSize || clusterSizeInfo.value <= 0 || declaredEnd > u8.length
		)
			? (nextCluster >= 0 ? nextCluster : u8.length)
			: declaredEnd;
		if (clusterEnd <= clusterDataStart) {
			cursor = clusterStart + CLUSTER_ID.length;
			continue;
		}

		let pos = clusterDataStart;
		while (pos < clusterEnd) {
			const idInfo = readEbmlId(u8, pos);
			if (!idInfo) break;
			const sizeInfo = readVint(u8, pos + idInfo.length);
			if (!sizeInfo) break;

			const dataOffset = pos + idInfo.length + sizeInfo.length;
			if (dataOffset >= clusterEnd || dataOffset + sizeInfo.value > u8.length) break;

			const elementEnd = Math.min(clusterEnd, dataOffset + sizeInfo.value);
			if (idInfo.value === TIMECODE_ID && sizeInfo.value > 0 && sizeInfo.value <= 8) {
				const timecode = readUnsignedBE(u8, dataOffset, sizeInfo.value);
				if (baseClusterTimecode === null) baseClusterTimecode = timecode;
				const normalized = Math.max(0, timecode - baseClusterTimecode);
				writeUnsignedBE(u8, dataOffset, sizeInfo.value, normalized);
				break;
			}
			if (elementEnd <= pos) break;
			pos = elementEnd;
		}

		cursor = clusterEnd;
	}
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

		// Some MediaRecorder WebM files begin with a non-zero cluster timecode, which
		// can make the seek/progress UI appear partially advanced at 0:00 in Obsidian.
		// Normalize cluster timecodes so the media timeline starts at zero.
		normalizeWebmClusterTimecodes(u8);

		// Search metadata only (before first Cluster) to avoid false positives.
		const firstCluster = findPattern(u8, CLUSTER_ID);
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
	targetFilePath?: string | null,
): Promise<boolean> {
	let targetFile: TFile | null = null;
	if (targetFilePath) {
		const candidate = app.vault.getAbstractFileByPath(normalizePath(targetFilePath));
		if (candidate instanceof TFile) targetFile = candidate;
	}
	if (!targetFile) {
		targetFile = app.workspace.getActiveFile();
	}
	if (!targetFile) return false;

	const date = new Date(startTime).toLocaleDateString('en-US', {
		year: 'numeric', month: 'long', day: 'numeric',
	});
	// Plain embeds — no list bullets so Obsidian renders the audio player inline.
	const section =
		`\n## LectureLight session — ${date}\n\n` +
		`![[${audioPath}]]\n\n` +
		`[[${jsonPath}]]\n`;

	await app.vault.process(targetFile, (content) => content + section);
	return true;
}
