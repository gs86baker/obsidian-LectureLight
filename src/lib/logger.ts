import { TimerSettings } from '../types';

export interface PerformanceEvent {
	id: string;
	type: 'SLIDE_CHANGE' | 'MANUAL_MARKER' | 'AUDIO_START' | 'AUDIO_STOP' | 'SESSION_START' | 'SESSION_STOP';
	timestamp: number;     // Date.now()
	elapsedTime: number;   // Seconds relative to session start
	slideIndex?: number;
	metadata?: {
		triggerType?: 'script' | 'manual';
		label?: string;
	};
}

export interface SessionLog {
	sessionId: string;
	startTime: string;     // ISO string
	config?: TimerSettings;
	summary?: {
		totalDurationSeconds: number;
		slideCount: number;
		markerCount: number;
		status: 'under-time' | 'on-track' | 'overtime';
	};
	events: PerformanceEvent[];
}

class PerformanceLogger {
	private log: SessionLog | null = null;
	private startTime = 0;

	startSession(sessionId: string = crypto.randomUUID(), config?: TimerSettings) {
		this.startTime = Date.now();
		this.log = {
			sessionId,
			startTime: new Date(this.startTime).toISOString(),
			config,
			events: [],
		};
		this.addEvent({ type: 'SESSION_START', timestamp: this.startTime, elapsedTime: 0 });
	}

	addEvent(event: Omit<PerformanceEvent, 'id'>) {
		if (!this.log) return;
		const fullEvent: PerformanceEvent = {
			id: crypto.randomUUID(),
			...event,
		};
		this.log.events.push(fullEvent);
	}

	trackSlideChange(index: number, label?: string) {
		if (!this.log) return;
		const now = Date.now();
		this.addEvent({
			type: 'SLIDE_CHANGE',
			timestamp: now,
			elapsedTime: (now - this.startTime) / 1000,
			slideIndex: index,
			metadata: { label },
		});
	}

	trackMarker(label: string, triggerType: 'script' | 'manual' = 'manual') {
		if (!this.log) return;
		const now = Date.now();
		this.addEvent({
			type: 'MANUAL_MARKER',
			timestamp: now,
			elapsedTime: (now - this.startTime) / 1000,
			metadata: { label, triggerType },
		});
	}

	stopSession(): SessionLog | null {
		if (!this.log) return null;

		const now = Date.now();
		const duration = (now - this.startTime) / 1000;
		this.addEvent({ type: 'SESSION_STOP', timestamp: now, elapsedTime: duration });

		const slideCount = this.log.events.filter(e => e.type === 'SLIDE_CHANGE').length;
		const markerCount = this.log.events.filter(e => e.type === 'MANUAL_MARKER').length;

		let status: 'under-time' | 'on-track' | 'overtime' = 'on-track';
		if (this.log.config) {
			const targetSec = this.log.config.targetMinutes * 60;
			if (duration > targetSec) status = 'overtime';
			else if (duration < targetSec * 0.8) status = 'under-time';
		}

		this.log.summary = { totalDurationSeconds: duration, slideCount, markerCount, status };
		return this.log;
	}

	exportLog(): string | null {
		if (!this.log) return null;
		return JSON.stringify(this.log, null, 2);
	}
}

export const logger = new PerformanceLogger();
