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
import { MAX_TARGET_MINUTES, validateTimerSettings } from '../lib/parser';

const BtnIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<svg
		className="ll-btn-icon-svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		{children}
	</svg>
);

const BtnContent: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
	<span className="ll-btn-content">
		<span className="ll-btn-icon">{icon}</span>
		<span className="ll-btn-text">{label}</span>
	</span>
);

interface PresenterConsoleProps {
	parseResult: ParseResult | null;
	settings:    LectureLightSettings;
	app:         App;
	sourceFilePath: string | null;
	sourceFileBasename: string | null;
}

export const PresenterConsole: React.FC<PresenterConsoleProps> = ({
	parseResult,
	settings,
	app,
	sourceFilePath,
	sourceFileBasename,
}) => {
	const [currentSlideIndex,    setCurrentSlideIndex]    = useState(0);
	const [elapsedSeconds,       setElapsedSeconds]       = useState(0);
	const [isSessionActive,      setIsSessionActive]      = useState(false);
	const [isFilmStripVisible,   setIsFilmStripVisible]   = useState(true);
	const [teleprompterFontSize, setTeleprompterFontSize] = useState(20);
	const [isStageOpen,          setIsStageOpen]          = useState(false);
	const [stageLightTheme,      setStageLightTheme]      = useState(false);
	const [isSaving,             setIsSaving]             = useState(false);
	const [isSessionTransitioning, setIsSessionTransitioning] = useState(false);
	const [isMicEnabled,         setIsMicEnabled]         = useState(true);
	const [sessionHasAudio,      setSessionHasAudio]      = useState(false);
	const sessionToggleLockRef = useRef(false);
	const sessionNoteRef = useRef<{ path: string | null; title: string }>({
		path: null,
		title: 'untitled',
	});

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
	const timerValidation = validateTimerSettings(timerSettings);
	const showTimerPlaceholder = timerSettings.targetMinutes > MAX_TARGET_MINUTES;

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

	// Turning off microphone capture should immediately release any active mic stream.
	useEffect(() => {
		if (!isMicEnabled) releaseRecorder();
	}, [isMicEnabled, releaseRecorder]);

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
		if (sessionToggleLockRef.current) return;
		sessionToggleLockRef.current = true;
		setIsSessionTransitioning(true);

		try {
			if (isSessionActive) {
				// Stop: halt timer immediately, then collect recording and save.
				setIsSessionActive(false);
				const sessionLog = logger.stopSession();
				const blob = sessionHasAudio ? await stopRecording() : null;
				setSessionHasAudio(false);

				if (blob && sessionLog) {
					setIsSaving(true);
					try {
						const noteTitle = sessionNoteRef.current.title;
						const { audioPath, jsonPath } = await saveRecording(
							app, blob, sessionLog, noteTitle, mimeType, settings.recordingFolder,
						);
						const appended = await appendSessionLinks(
							app,
							audioPath,
							jsonPath,
							sessionLog.startTime,
							sessionNoteRef.current.path,
						);
						if (!appended) {
							new Notice('Recording saved, but could not append links to the source note.');
						} else {
							new Notice('Recording saved to vault.');
						}
					} catch (e) {
						new Notice('Failed to save recording — check the developer console for details.');
						console.error('[LectureLight] Save failed:', e);
					} finally {
						setIsSaving(false);
					}
				}
			} else {
				if (!timerValidation.isValid) return;
				const activeFile = app.workspace.getActiveFile();
				sessionNoteRef.current = {
					path: sourceFilePath ?? activeFile?.path ?? null,
					title: sourceFileBasename ?? activeFile?.basename ?? 'untitled',
				};
				// Start: initialise logger, request mic, begin recording.
				logger.startSession(crypto.randomUUID(), timerSettings);
				if (currentSlide) {
					logger.trackSlideChange(currentSlideIndex, currentSlide.label);
				}
				if (isMicEnabled) {
					const recordingStarted = await startRecording();
					setSessionHasAudio(recordingStarted);
					if (!recordingStarted) {
						new Notice('Session started, but microphone recording could not start.');
					}
				} else {
					setSessionHasAudio(false);
				}
				// Start the session even if mic permission was denied (timer still runs).
				setIsSessionActive(true);
			}
		} finally {
			sessionToggleLockRef.current = false;
			setIsSessionTransitioning(false);
		}
	}, [
		isSessionActive,
		sessionHasAudio,
		currentSlideIndex,
		currentSlide,
		timerSettings,
		timerValidation.isValid,
		mimeType,
		isMicEnabled,
		sourceFilePath,
		sourceFileBasename,
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
	const meterVisible = isMicEnabled && isTesting;
	const meterPercent = Math.round(Math.min(level * 100, 100));
	const meterSegmentCount = 24;
	const activeSegments = Math.round((meterPercent / 100) * meterSegmentCount);

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className={`ll-presenter${stageLightTheme ? ' ll-stage-light' : ''}`}>
			{/* ── Main content ── */}
			<div className="ll-body">
				<div className="ll-main-column">
					{/* ── Header ── */}
						<header className="ll-header">
							<div className="ll-header-left">
							<button
								className="ll-btn ll-btn-nav"
								onClick={() => goToSlide(currentSlideIndex - 1)}
								disabled={currentSlideIndex === 0}
								aria-label="Previous slide"
							>
								<BtnContent
									icon={<BtnIcon><polyline points="15 18 9 12 15 6" /></BtnIcon>}
									label="Previous"
								/>
							</button>
							<span className="ll-slide-counter">
								{currentSlideIndex + 1} / {slides.length}
							</span>
							<button
								className="ll-btn ll-btn-nav"
								onClick={() => goToSlide(currentSlideIndex + 1)}
								disabled={currentSlideIndex === slides.length - 1}
								aria-label="Next slide"
							>
								<BtnContent
									icon={<BtnIcon><polyline points="9 18 15 12 9 6" /></BtnIcon>}
									label="Next"
								/>
							</button>
							</div>
							<div className="ll-header-right">
								<button
									className="ll-btn ll-btn-sm"
									onClick={() => setTeleprompterFontSize(s => Math.max(14, s - 2))}
									aria-label="Decrease font size"
								>
									Text -
								</button>
								<button
									className="ll-btn ll-btn-sm"
									onClick={() => setTeleprompterFontSize(s => Math.min(36, s + 2))}
									aria-label="Increase font size"
								>
									Text +
								</button>
							</div>
						</header>

					{/* Teleprompter (left, scrollable) */}
					<div className="ll-teleprompter-panel">
						<Teleprompter
							slides={slides}
							currentSlideIndex={currentSlideIndex}
							onSlideSelect={goToSlide}
							fontSize={teleprompterFontSize}
						/>
					</div>
				</div>

				{/* Sidebar (right, fixed width) */}
				<aside className="ll-sidebar">
					<div className="ll-preview-section">
						<div className="ll-section-label">Stage preview</div>
						<div className={`ll-slide-canvas${stageLightTheme ? ' ll-theme-light' : ''}`}>
							<div
								className={`ll-slide-html ll-layout-${currentSlide?.layout ?? 'standard'}${stageLightTheme ? ' ll-theme-light' : ''}`}
								dangerouslySetInnerHTML={{ __html: currentSlide?.htmlContent ?? '' }}
							/>
						</div>
						<div className="ll-slide-label">
							{currentSlide?.label ?? `Slide ${currentSlideIndex + 1}`}
						</div>
						<div className="ll-preview-controls">
							<button
								className={`ll-btn ll-btn-preview-stage${isStageOpen ? ' ll-btn-stage-active' : ''}`}
								onClick={() => { void openStage(); }}
								aria-label="Open stage display"
							>
								<BtnContent
									icon={<BtnIcon><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" /></BtnIcon>}
									label="Stage display"
								/>
							</button>
							<button
								className={`ll-btn ll-btn-icon-only ll-btn-preview-theme ${stageLightTheme ? 'll-btn-preview-theme--light' : 'll-btn-preview-theme--dark'}`}
								onClick={toggleTheme}
								aria-label={stageLightTheme ? 'Switch stage theme to dark mode' : 'Switch stage theme to light mode'}
							>
								<span className="ll-btn-icon" aria-hidden="true">
									{stageLightTheme
										? (
											<BtnIcon>
												<circle cx="12" cy="12" r="4" />
												<path d="M12 2v2" />
												<path d="M12 20v2" />
												<path d="m4.93 4.93 1.41 1.41" />
												<path d="m17.66 17.66 1.41 1.41" />
												<path d="M2 12h2" />
												<path d="M20 12h2" />
												<path d="m6.34 17.66-1.41 1.41" />
												<path d="m19.07 4.93-1.41 1.41" />
											</BtnIcon>
										)
										: (
											<BtnIcon>
												<path d="M21 12.8A9 9 0 1 1 11.2 3a7.5 7.5 0 1 0 9.8 9.8z" />
											</BtnIcon>
										)}
								</span>
							</button>
						</div>
					</div>

					<TrafficLightTimer
						elapsedSeconds={elapsedSeconds}
						isActive={isSessionActive}
						settings={timerSettings}
						errorMessage={timerValidation.message}
						showTimePlaceholder={showTimerPlaceholder}
					>
							<div className="ll-session-controls">
								<button
									className={`ll-btn ll-btn-record ll-session-start ${isSessionActive ? 'll-btn-stop' : 'll-btn-start'}`}
									onClick={() => { void handleSessionToggle(); }}
									disabled={isSessionTransitioning || isSaving || (!isSessionActive && !timerValidation.isValid)}
									aria-label={isSessionActive ? 'Stop session and save recording' : 'Start session and recording'}
								>
									<BtnContent
										icon={
											isSaving
												? <BtnIcon><path d="M12 4v4" /><path d="M12 16v4" /><path d="M4 12h4" /><path d="M16 12h4" /></BtnIcon>
												: isSessionActive
													? <BtnIcon><rect x="7" y="7" width="10" height="10" rx="1" /></BtnIcon>
													: <BtnIcon><polygon points="8,5 19,12 8,19" /></BtnIcon>
										}
										label={isSaving ? 'Saving…' : isSessionActive ? 'Stop' : 'Start'}
									/>
								</button>
								<button
									className="ll-btn ll-session-reset"
									onClick={() => setElapsedSeconds(0)}
									disabled={isSaving || isSessionTransitioning}
									aria-label="Reset timer"
								>
									<BtnContent
										icon={<BtnIcon><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 3 3 9 9 9" /></BtnIcon>}
										label="Reset"
									/>
								</button>
							</div>

							<div className="ll-recording-card">
								<div className="ll-recording-card-head">
									<div className="ll-recording-card-title">
										<BtnIcon>
											<rect x="9" y="3" width="6" height="11" rx="3" />
											<path d="M6 10a6 6 0 0 0 12 0" />
											<path d="M12 19v2" />
											<path d="M9 21h6" />
										</BtnIcon>
										<span>Audio recording</span>
									</div>
									<label className="ll-recording-enable">
										<input
											type="checkbox"
											checked={isMicEnabled}
											onChange={(e) => setIsMicEnabled(e.target.checked)}
											disabled={isSessionActive || isSaving || isSessionTransitioning}
										/>
										<span>Enable</span>
									</label>
								</div>

								{(isTesting || isRecording) && isMicEnabled && (
									<div className="ll-recording-ready">
										<span className="ll-recording-ready-dot" />
										<span>Mic ready</span>
									</div>
								)}

								<button
									className={`ll-btn ll-btn-record ll-btn-test-mic${isTesting ? ' ll-btn-mic-active' : ''}`}
									onClick={() => { void testMic(); }}
									disabled={!isMicEnabled || isSessionActive || isSaving || isSessionTransitioning}
									aria-label="Test microphone"
								>
									<BtnContent
										icon={<BtnIcon><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 10a6 6 0 0 0 12 0" /><path d="M12 19v2" /><path d="M9 21h6" /></BtnIcon>}
										label={isTesting ? 'Mic on' : 'Test mic'}
									/>
								</button>

								{meterVisible && (
									<div className="ll-level-meter-wrap" aria-label={`Microphone level ${meterPercent}%`}>
										<span className="ll-level-meter-icon" aria-hidden="true">
											<BtnIcon>
												<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
												<path d="M16 9a5 5 0 0 1 0 6" />
												<path d="M19.4 18.4a9 9 0 0 0 0-12.8" />
											</BtnIcon>
										</span>
										<div className="ll-level-meter-grid">
											{Array.from({ length: meterSegmentCount }, (_, index) => {
												const isActive = index < activeSegments;
												const isWarnZone = index >= Math.floor(meterSegmentCount * 0.75);
												const isPeakZone = index >= Math.floor(meterSegmentCount * 0.9);
												let cls = 'll-level-segment';
												if (isActive) cls += ' ll-level-segment--active';
												if (isWarnZone) cls += ' ll-level-segment--warn-zone';
												if (isPeakZone) cls += ' ll-level-segment--peak-zone';
												return <span key={index} className={cls} />;
											})}
										</div>
									</div>
								)}

								{!isMicEnabled && (
									<div className="ll-recording-status ll-recording-status--dim">
										Microphone disabled
									</div>
								)}

								{isRecording && (
									<div className="ll-recording-status">
										<span className="ll-recording-dot" />
										<span>Recording</span>
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

							<button
								className={`ll-btn ll-btn-record ll-btn-filmstrip${isFilmStripVisible ? ' ll-btn-active' : ''}`}
								onClick={() => setIsFilmStripVisible(v => !v)}
								aria-label="Toggle film strip"
							>
								<BtnContent
									icon={<BtnIcon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14" /><path d="M17 5v14" /><path d="M3 9h4" /><path d="M17 9h4" /><path d="M3 15h4" /><path d="M17 15h4" /></BtnIcon>}
									label="Toggle Film Strip"
								/>
							</button>
						</TrafficLightTimer>
					</aside>
				</div>

			{/* ── FilmStrip (bottom, collapsible) ── */}
			{isFilmStripVisible && (
				<FilmStrip
					slides={slides}
					currentSlideIndex={currentSlideIndex}
					onSlideSelect={goToSlide}
					lightTheme={stageLightTheme}
				/>
			)}
		</div>
	);
};
