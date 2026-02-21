import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderStatus = 'idle' | 'requesting' | 'testing' | 'recording' | 'error';

export interface UseAudioRecorderReturn {
	/** Current lifecycle state of the recorder. */
	status: RecorderStatus;
	/** Human-readable error message when status === 'error'. */
	error: string | null;
	/** RMS audio level, 0–1, updated every animation frame while mic is active. */
	level: number;
	/** The MIME type that will be used for recording (e.g. 'audio/webm;codecs=opus'). */
	mimeType: string;
	/** Acquire mic and run the level meter without starting a recording.
	 *  Calling again while testing stops the test and releases the mic. */
	testMic: () => Promise<void>;
	/** Acquire mic and start recording. Resolves once MediaRecorder is running. */
	startRecording: () => Promise<void>;
	/** Stop the active recording. Resolves with the assembled audio Blob, or null
	 *  if no recording was active. The mic is released after stop. */
	stopRecording: () => Promise<Blob | null>;
	/** Immediately stop everything and release the microphone. */
	release: () => void;
}

const PREFERRED_MIME_TYPES = [
	'audio/mp4',              // preferred: works on Windows/macOS; MP4 container includes correct duration metadata
	'audio/webm;codecs=opus', // Linux / fallback: Opus codec in WebM
	'audio/webm',
	'audio/ogg;codecs=opus',
];

function detectMimeType(): string {
	if (typeof MediaRecorder === 'undefined') return '';
	return PREFERRED_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

const METER_ATTACK = 0.55;
const METER_RELEASE = 0.12;
const METER_NOISE_FLOOR = 0.003;
const METER_GAIN = 2.5;
const METER_CURVE = 2.8;

export function useAudioRecorder(): UseAudioRecorderReturn {
	const [status, setStatus] = useState<RecorderStatus>('idle');
	const [error, setError]   = useState<string | null>(null);
	const [level, setLevel]   = useState(0);

	// Computed once on first render; stable for the component lifetime.
	const mimeType = useRef(detectMimeType()).current;

	const streamRef   = useRef<MediaStream | null>(null);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef   = useRef<Blob[]>([]);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const rafRef      = useRef<number>(0);
	const meterLevelRef = useRef(0);

	// ── Level meter ────────────────────────────────────────────────────────────

	const stopLevelMeter = useCallback(() => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
		}
		if (audioCtxRef.current) {
			void audioCtxRef.current.close();
			audioCtxRef.current = null;
		}
		meterLevelRef.current = 0;
		setLevel(0);
	}, []);

	const startLevelMeter = useCallback((stream: MediaStream) => {
		stopLevelMeter();
		const ctx      = new AudioContext({ latencyHint: 'interactive' });
		const analyser = ctx.createAnalyser();
		// Time-domain waveform data gives accurate RMS amplitude for a level meter.
		// fftSize controls the sample window; larger = smoother but slightly more lag.
		analyser.fftSize = 1024;
		analyser.smoothingTimeConstant = 0;
		ctx.createMediaStreamSource(stream).connect(analyser);
		void ctx.resume();
		audioCtxRef.current = ctx;

		const buf = new Float32Array(analyser.fftSize);
		meterLevelRef.current = 0;
		const tick = () => {
			analyser.getFloatTimeDomainData(buf);
			let sum = 0;
			let peak = 0;
			for (let i = 0; i < buf.length; i++) {
				const v = buf[i] ?? 0;
				sum += v * v;
				const abs = Math.abs(v);
				if (abs > peak) peak = abs;
			}
			const rms = Math.sqrt(sum / buf.length);

			// Blend RMS and peak so regular speech is visible while preserving transients.
			const gatedRms = Math.max(0, rms - METER_NOISE_FLOOR);
			const gatedPeak = Math.max(0, peak - METER_NOISE_FLOOR);
			const signal = Math.max(gatedRms * METER_GAIN, gatedPeak * (METER_GAIN * 0.7));
			const target = Math.min(1, 1 - Math.exp(-signal * METER_CURVE));
			const current = meterLevelRef.current;
			const alpha = target >= current ? METER_ATTACK : METER_RELEASE;
			const next = current + (target - current) * alpha;

			meterLevelRef.current = next;
			setLevel(next);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
	}, [stopLevelMeter]);

	// ── Mic acquisition ────────────────────────────────────────────────────────

	const acquireStream = useCallback(async (): Promise<MediaStream | null> => {
		if (streamRef.current) return streamRef.current;
		setStatus('requesting');
		setError(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			streamRef.current = stream;
			return stream;
		} catch (err) {
			const isDenied =
				err instanceof DOMException &&
				(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
			const msg = isDenied
				? 'Microphone access denied. Allow microphone access in your system settings and try again.'
				: `Could not access microphone: ${err instanceof Error ? err.message : String(err)}`;
			setError(msg);
			setStatus('error');
			return null;
		}
	}, []);

	// ── Full cleanup ───────────────────────────────────────────────────────────

	const release = useCallback(() => {
		stopLevelMeter();
		if (recorderRef.current && recorderRef.current.state !== 'inactive') {
			recorderRef.current.stop();
		}
		recorderRef.current = null;
		chunksRef.current   = [];
		streamRef.current?.getTracks().forEach(t => t.stop());
		streamRef.current = null;
		setStatus('idle');
		setError(null);
	}, [stopLevelMeter]);

	// Release everything on unmount.
	useEffect(() => () => release(), [release]);

	// ── Public API ─────────────────────────────────────────────────────────────

	const testMic = useCallback(async () => {
		if (status === 'recording') return;      // never interrupt an active recording
		if (status === 'testing') { release(); return; }  // toggle off
		const stream = await acquireStream();
		if (!stream) return;
		startLevelMeter(stream);
		setStatus('testing');
	}, [status, acquireStream, release, startLevelMeter]);

	const startRecording = useCallback(async () => {
		if (status === 'recording') return;
		const stream = await acquireStream();
		if (!stream) return;

		chunksRef.current = [];
		const options  = mimeType ? { mimeType } : undefined;
		const recorder = new MediaRecorder(stream, options);
		recorderRef.current = recorder;

		recorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0) chunksRef.current.push(e.data);
		};

		// Start without a timeslice so the recorder can finalize container metadata
		// (especially duration) in one stream at stop.
		recorder.start();
		startLevelMeter(stream);
		setStatus('recording');
		setError(null);
	}, [status, mimeType, acquireStream, startLevelMeter]);

	const stopRecording = useCallback((): Promise<Blob | null> => {
		return new Promise((resolve) => {
			const recorder = recorderRef.current;
			if (!recorder || recorder.state === 'inactive') {
				resolve(null);
				return;
			}
			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
				chunksRef.current = [];
				stopLevelMeter();
				streamRef.current?.getTracks().forEach(t => t.stop());
				streamRef.current   = null;
				recorderRef.current = null;
				setStatus('idle');
				resolve(blob);
			};
			recorder.stop();
		});
	}, [mimeType, stopLevelMeter]);

	return { status, error, level, mimeType, testMic, startRecording, stopRecording, release };
}
