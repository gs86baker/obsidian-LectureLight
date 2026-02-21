import React, { useState, useCallback, useEffect, useRef } from 'react';
import { App, Notice } from 'obsidian';
import { ParseResult } from '../types';
import { LectureLightSettings } from '../settings';
import { TrafficLightTimer } from './TrafficLightTimer';
import { FilmStrip } from './FilmStrip';
import { Teleprompter } from './Teleprompter';
import { VIEW_TYPE_STAGE } from '../stageView';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { logger } from '../lib/logger';
import { saveRecording, appendSessionLinks } from '../lib/vaultSave';

interface PresenterConsoleProps {
	parseResult: ParseResult | null;
	settings:    LectureLightSettings;
	app:         App;
}

export const PresenterConsole: React.FC<PresenterConsoleProps> = ({ parseResult, settings, app }) => {
	const [currentSlideIndex,    setCurrentSlideIndex]    = useState(0);
	const [elapsedSeconds,       setElapsedSeconds]       = useState(0);
	const [isSessionActive,      setIsSessionActive]      = useState(false);
	const [isFilmStripVisible,   setIsFilmStripVisible]   = useState(true);
	const [teleprompterFontSize, setTeleprompterFontSize] = useState(20);
	const [isStageOpen,          setIsStageOpen]          = useState(false);
	const [stageLightTheme,      setStageLightTheme]      = useState(false);
	const [isSaving,             setIsSaving]             = useState(false);

	const channelRef = useRef<BroadcastChannel | null>(null);

	const {
		status:         recorderStatus,
		error:          recorderError,
		level,
		mimeType,
		testMic,
		startRecording,
		stopRecording,
		release:        releaseRecorder,
	} = useAudioRecorder();

	const slides = parseResult?.slides ?? [];

	// Fall back to plugin settings when the note has no :::lecturelight block
	const timerSettings = parseResult?.timerSettings ?? {
		targetMinutes:  settings.targetMinutes,
		warningMinutes: settings.warningMinutes,
		wrapUpMinutes:  settings.wrapUpMinutes,
	};

	// Clamp the slide index when a note edit removes slides
	useEffect(() => {
		if (slides.length > 0 && currentSlideIndex >= slides.length) {
			setCurrentSlideIndex(slides.length - 1);
		}
	}, [slides.length, currentSlideIndex]);

	// Session timer
	useEffect(() => {
		if (!isSessionActive) return;
		const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
		return () => clearInterval(interval);
	}, [isSessionActive]);

	// BroadcastChannel init — create on mount, close on unmount
	useEffect(() => {
		const ch = new BroadcastChannel('lecturelight-stage');
		channelRef.current = ch;
		return () => {
			ch.close();
			channelRef.current = null;
		};
	}, []);

	// Stage close detection — poll workspace every 1 s
	useEffect(() => {
		if (!isStageOpen) return;
		const id = setInterval(() => {
			if (app.workspace.getLeavesOfType(VIEW_TYPE_STAGE).length === 0) {
				setIsStageOpen(false);
			}
		}, 1000);
		return () => clearInterval(id);
	}, [isStageOpen, app]);

	// Stage leaf cleanup on component unmount; also release mic
	useEffect(() => {
		return () => {
			app.workspace.getLeavesOfType(VIEW_TYPE_STAGE).forEach(leaf => leaf.detach());
			releaseRecorder();
		};
	}, [app, releaseRecorder]);

	const currentSlide = slides[currentSlideIndex];

	// Slide sync — send slide-change whenever current slide changes
	useEffect(() => {
		if (!channelRef.current) return;
		if (app.workspace.getLeavesOfType(VIEW_TYPE_STAGE).length === 0) return;
		if (!currentSlide) return;
		channelRef.current.postMessage({
			type:        'slide-change',
			htmlContent: currentSlide.htmlContent,
			index:       currentSlideIndex,
			total:       slides.length,
			label:       currentSlide.label,
			layout:      currentSlide.layout,
		});
	}, [currentSlideIndex, currentSlide, slides.length, app]);

	// Theme sync — send theme-change whenever stageLightTheme toggles
	useEffect(() => {
		if (!channelRef.current) return;
		if (app.workspace.getLeavesOfType(VIEW_TYPE_STAGE).length === 0) return;
		channelRef.current.postMessage({
			type:  'theme-change',
			light: stageLightTheme,
		});
	}, [stageLightTheme, app]);

	// Session slide-change logging — tracks every navigation during an active session
	const prevSlideIndexRef = useRef(currentSlideIndex);
	useEffect(() => {
		if (isSessionActive && currentSlideIndex !== prevSlideIndexRef.current) {
			logger.trackSlideChange(currentSlideIndex, slides[currentSlideIndex]?.label);
		}
		prevSlideIndexRef.current = currentSlideIndex;
	}, [currentSlideIndex, isSessionActive, slides]);

	const goToSlide = useCallback((index: number) => {
		if (index < 0 || index >= slides.length) return;
		setCurrentSlideIndex(index);
		// Reset timer when navigating back to the first slide during an active session
		if (index === 0 && isSessionActive) {
			setElapsedSeconds(0);
		}
	}, [slides.length, isSessionActive]);

	// Keyboard navigation — arrow keys and Page Up/Down
	const goToSlideRef = useRef(goToSlide);
	useEffect(() => { goToSlideRef.current = goToSlide; }, [goToSlide]);
	const slideCountRef = useRef(slides.length);
	useEffect(() => { slideCountRef.current = slides.length; }, [slides.length]);
	const slideIndexRef = useRef(currentSlideIndex);
	useEffect(() => { slideIndexRef.current = currentSlideIndex; }, [currentSlideIndex]);

	useEffect(() => {
		const handler = (e: KeyboardEvent): void => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
			if (e.key === 'ArrowRight' || e.key === 'PageDown') {
				e.preventDefault();
				goToSlideRef.current(Math.min(slideIndexRef.current + 1, slideCountRef.current - 1));
			} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
				e.preventDefault();
				goToSlideRef.current(Math.max(slideIndexRef.current - 1, 0));
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, []); // stable — uses refs for all dynamic values

	// ── Session start / stop ───────────────────────────────────────────────────

	const handleSessionToggle = useCallback(async () => {
		if (isSessionActive) {
			// Stop: halt timer immediately, then collect recording and save.
			setIsSessionActive(false);
			const sessionLog = logger.stopSession();
			const blob       = await stopRecording();

			if (blob && sessionLog) {
				setIsSaving(true);
				try {
					const noteTitle = app.workspace.getActiveFile()?.basename ?? 'untitled';
					const { audioPath, jsonPath } = await saveRecording(
						app, blob, sessionLog, noteTitle, mimeType, settings.recordingFolder,
					);
					await appendSessionLinks(app, audioPath, jsonPath, sessionLog.startTime);
					new Notice('Recording saved to vault.');
				} catch (e) {
					new Notice('Failed to save recording — check the developer console for details.');
					console.error('[LectureLight] Save failed:', e);
				} finally {
					setIsSaving(false);
				}
			}
		} else {
			// Start: initialise logger, request mic, begin recording.
			logger.startSession(crypto.randomUUID(), timerSettings);
			if (currentSlide) {
				logger.trackSlideChange(currentSlideIndex, currentSlide.label);
			}
			await startRecording();
			// Start the session even if mic permission was denied (timer still runs).
			setIsSessionActive(true);
		}
	}, [
		isSessionActive,
		currentSlideIndex,
		currentSlide,
		timerSettings,
		mimeType,
		app,
		settings.recordingFolder,
		startRecording,
		stopRecording,
	]);

	// ── Stage window ───────────────────────────────────────────────────────────

	const openStage = useCallback(async () => {
		const existing = app.workspace.getLeavesOfType(VIEW_TYPE_STAGE);
		if (existing.length > 0 && existing[0]) {
			await app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = app.workspace.openPopoutLeaf({ size: { width: 1920, height: 1080 } });
		await leaf.setViewState({ type: VIEW_TYPE_STAGE, active: true });
		setIsStageOpen(true);

		setTimeout(() => {
			if (!channelRef.current || !currentSlide) return;
			channelRef.current.postMessage({
				type:        'slide-change',
				htmlContent: currentSlide.htmlContent,
				index:       currentSlideIndex,
				total:       slides.length,
				label:       currentSlide.label,
				layout:      currentSlide.layout,
			});
			channelRef.current.postMessage({ type: 'theme-change', light: stageLightTheme });
		}, 800);
	}, [app, currentSlide, currentSlideIndex, slides.length, stageLightTheme]);

	const toggleTheme = useCallback(() => setStageLightTheme(t => !t), []);

	// ── Empty state ────────────────────────────────────────────────────────────

	if (!parseResult || slides.length === 0) {
		return (
			<div className="ll-empty">
				<div className="ll-empty-icon">🎞</div>
				<p className="ll-empty-title">No slides found</p>
				<p className="ll-empty-hint">
					Open a note containing <code>:::slide [Label]</code> blocks.
				</p>
			</div>
		);
	}

	// ── Derived recording UI values ────────────────────────────────────────────

	const isRecording  = recorderStatus === 'recording';
	const isTesting    = recorderStatus === 'testing';
	const meterVisible = isRecording || isTesting;
	const levelPct     = `${Math.min(level * 100, 100).toFixed(1)}%`;
	const meterClass   = level > 0.8
		? 'll-level-meter-bar ll-level-meter-bar--peak'
		: level > 0.6
			? 'll-level-meter-bar ll-level-meter-bar--warning'
			: 'll-level-meter-bar';

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className="ll-presenter">
			{/* ── Header ── */}
			<header className="ll-header">
				<div className="ll-header-left">
					<button
						className="ll-btn ll-btn-nav"
						onClick={() => goToSlide(currentSlideIndex - 1)}
						disabled={currentSlideIndex === 0}
						aria-label="Previous slide"
					>←</button>
					<span className="ll-slide-counter">
						{currentSlideIndex + 1} / {slides.length}
					</span>
					<button
						className="ll-btn ll-btn-nav"
						onClick={() => goToSlide(currentSlideIndex + 1)}
						disabled={currentSlideIndex === slides.length - 1}
						aria-label="Next slide"
					>→</button>
				</div>

				<div className="ll-header-right">
					<button
						className="ll-btn ll-btn-sm"
						onClick={() => setTeleprompterFontSize(s => Math.max(14, s - 2))}
						aria-label="Decrease font size"
					>A−</button>
					<button
						className="ll-btn ll-btn-sm"
						onClick={() => setTeleprompterFontSize(s => Math.min(36, s + 2))}
						aria-label="Increase font size"
					>A+</button>
					<button
						className="ll-btn ll-btn-sm"
						onClick={() => setElapsedSeconds(0)}
						aria-label="Reset timer"
					>↺</button>
					<button
						className={`ll-btn ll-btn-sm${stageLightTheme ? ' ll-btn-theme-active' : ''}`}
						onClick={toggleTheme}
						aria-label="Toggle stage theme"
					>☀</button>
					<button
						className={`ll-btn ll-btn-sm${isStageOpen ? ' ll-btn-stage-active' : ''}`}
						onClick={() => { void openStage(); }}
						aria-label="Open stage window"
					>
						{isStageOpen ? '⊡ Live' : '⊡ Stage'}
					</button>
					<button
						className={`ll-btn ll-btn-sm${isTesting ? ' ll-btn-mic-active' : ''}`}
						onClick={() => { void testMic(); }}
						disabled={isSessionActive || isSaving}
						aria-label="Test microphone"
					>
						{isTesting ? 'Mic on' : 'Test mic'}
					</button>
					<button
						className={`ll-btn ${isSessionActive ? 'll-btn-stop' : 'll-btn-start'}`}
						onClick={() => { void handleSessionToggle(); }}
						disabled={isSaving}
						aria-label={isSessionActive ? 'Stop session and save recording' : 'Start session and recording'}
					>
						{isSaving ? 'Saving…' : isSessionActive ? 'Stop' : 'Start'}
					</button>
					<button
						className={`ll-btn ll-btn-sm${isFilmStripVisible ? ' ll-btn-active' : ''}`}
						onClick={() => setIsFilmStripVisible(v => !v)}
						aria-label="Toggle film strip"
					>☰</button>
				</div>
			</header>

			{/* ── Main content ── */}
			<div className="ll-body">
				{/* Teleprompter (left, scrollable) */}
				<div className="ll-teleprompter-panel">
					<Teleprompter
						slides={slides}
						currentSlideIndex={currentSlideIndex}
						onSlideSelect={goToSlide}
						fontSize={teleprompterFontSize}
					/>
				</div>

				{/* Sidebar (right, fixed width) */}
				<aside className="ll-sidebar">
					<div className="ll-preview-section">
						<div className="ll-section-label">Stage preview</div>
						<div className="ll-slide-canvas">
							<div
								className={`ll-slide-html ll-layout-${currentSlide?.layout ?? 'standard'}`}
								dangerouslySetInnerHTML={{ __html: currentSlide?.htmlContent ?? '' }}
							/>
						</div>
						<div className="ll-slide-label">
							{currentSlide?.label ?? `Slide ${currentSlideIndex + 1}`}
						</div>
					</div>

					<TrafficLightTimer
						elapsedSeconds={elapsedSeconds}
						isActive={isSessionActive}
						settings={timerSettings}
					/>

					{/* ── Recording panel ── */}
					<div className="ll-recording-section">
						<div className="ll-section-label">Recording</div>

						{meterVisible && (
							<div className="ll-level-meter-wrap">
								<div className={meterClass} style={{ width: levelPct }} />
							</div>
						)}

						{isRecording && (
							<div className="ll-recording-status">
								<span className="ll-recording-dot" />
								<span>Recording</span>
							</div>
						)}

						{isTesting && (
							<div className="ll-recording-status ll-recording-status--dim">
								Mic active
							</div>
						)}

						{recorderStatus === 'requesting' && (
							<div className="ll-recording-status ll-recording-status--dim">
								Requesting mic…
							</div>
						)}

						{isSaving && (
							<div className="ll-recording-status ll-recording-status--dim">
								Saving…
							</div>
						)}

						{recorderError && (
							<div className="ll-recording-error">{recorderError}</div>
						)}
					</div>
				</aside>
			</div>

			{/* ── FilmStrip (bottom, collapsible) ── */}
			{isFilmStripVisible && (
				<FilmStrip
					slides={slides}
					currentSlideIndex={currentSlideIndex}
					onSlideSelect={goToSlide}
				/>
			)}
		</div>
	);
};
