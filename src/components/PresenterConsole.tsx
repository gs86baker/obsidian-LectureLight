import React, { useState, useCallback, useEffect, useRef } from 'react';
import { App } from 'obsidian';
import { ParseResult } from '../types';
import { LectureLightSettings } from '../settings';
import { TrafficLightTimer } from './TrafficLightTimer';
import { FilmStrip } from './FilmStrip';
import { Teleprompter } from './Teleprompter';
import { VIEW_TYPE_STAGE } from '../stageView';

interface PresenterConsoleProps {
	parseResult: ParseResult | null;
	settings: LectureLightSettings;
	app: App;
}

export const PresenterConsole: React.FC<PresenterConsoleProps> = ({ parseResult, settings, app }) => {
	const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isSessionActive, setIsSessionActive] = useState(false);
	const [isFilmStripVisible, setIsFilmStripVisible] = useState(true);
	const [teleprompterFontSize, setTeleprompterFontSize] = useState(20);
	const [isStageOpen, setIsStageOpen] = useState(false);
	const [stageLightTheme, setStageLightTheme] = useState(false);

	const channelRef = useRef<BroadcastChannel | null>(null);

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

	// Stage leaf cleanup on component unmount
	useEffect(() => {
		return () => {
			app.workspace.getLeavesOfType(VIEW_TYPE_STAGE).forEach(leaf => leaf.detach());
		};
	}, [app]);

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

	const goToSlide = useCallback((index: number) => {
		if (index < 0 || index >= slides.length) return;
		setCurrentSlideIndex(index);
		// Reset timer when navigating back to the first slide during an active session
		if (index === 0 && isSessionActive) {
			setElapsedSeconds(0);
		}
	}, [slides.length, isSessionActive]);

	// Keyboard navigation — arrow keys and Page Up/Down
	useEffect(() => {
		const handler = (e: KeyboardEvent): void => {
			// Ignore when focus is inside an input or contenteditable
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
			if (e.key === 'ArrowRight' || e.key === 'PageDown') {
				e.preventDefault();
				setCurrentSlideIndex(i => Math.min(i + 1, slides.length - 1));
			} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
				e.preventDefault();
				setCurrentSlideIndex(i => {
					const next = Math.max(i - 1, 0);
					if (next === 0 && isSessionActive) setElapsedSeconds(0);
					return next;
				});
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [slides.length, isSessionActive]);

	const openStage = useCallback(async () => {
		// Focus existing stage leaf if already open
		const existing = app.workspace.getLeavesOfType(VIEW_TYPE_STAGE);
		if (existing.length > 0 && existing[0]) {
			await app.workspace.revealLeaf(existing[0]);
			return;
		}

		// Open a native popout window via Obsidian's workspace API
		const leaf = app.workspace.openPopoutLeaf({ size: { width: 1280, height: 720 } });
		await leaf.setViewState({ type: VIEW_TYPE_STAGE, active: true });
		setIsStageOpen(true);

		// Send current slide and theme once the view has had time to set up its channel
		setTimeout(() => {
			if (!channelRef.current || !currentSlide) return;
			channelRef.current.postMessage({
				type:        'slide-change',
				htmlContent: currentSlide.htmlContent,
				index:       currentSlideIndex,
				total:       slides.length,
				label:       currentSlide.label,
			});
			channelRef.current.postMessage({
				type:  'theme-change',
				light: stageLightTheme,
			});
		}, 800);
	}, [app, currentSlide, currentSlideIndex, slides.length, stageLightTheme]);

	const toggleTheme = useCallback(() => {
		setStageLightTheme(t => !t);
	}, []);

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
						className={`ll-btn ${isSessionActive ? 'll-btn-stop' : 'll-btn-start'}`}
						onClick={() => setIsSessionActive(a => !a)}
					>
						{isSessionActive ? 'Stop' : 'Start'}
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
								className="ll-slide-html"
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
