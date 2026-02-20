import React from 'react';
import { TimerSettings } from '../types';

interface TrafficLightTimerProps {
	elapsedSeconds: number;
	isActive: boolean;
	settings?: TimerSettings;
}

type TimerStatus = 'ready' | 'green' | 'yellow' | 'red' | 'overtime';

const LABELS: Record<TimerStatus, string> = {
	ready:    'Ready',
	green:    'On track',
	yellow:   'Warning',
	red:      'Wrap up',
	overtime: 'Overtime',
};

function getTimerStatus(
	elapsedSeconds: number,
	isActive: boolean,
	config: { targetMinutes: number; warningMinutes: number; wrapUpMinutes: number }
): TimerStatus {
	if (!isActive && elapsedSeconds === 0) return 'ready';
	const remainingSeconds = config.targetMinutes * 60 - elapsedSeconds;
	if (remainingSeconds < 0) return 'overtime';
	const remainingMins = remainingSeconds / 60;
	if (remainingMins <= config.wrapUpMinutes) return 'red';
	if (remainingMins <= config.warningMinutes) return 'yellow';
	return 'green';
}

function formatTime(totalSeconds: number): string {
	const abs = Math.abs(totalSeconds);
	const m = Math.floor(abs / 60);
	const s = abs % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TrafficLightTimer: React.FC<TrafficLightTimerProps> = ({
	elapsedSeconds,
	isActive,
	settings,
}) => {
	const config = {
		targetMinutes:  settings?.targetMinutes  ?? 30,
		warningMinutes: settings?.warningMinutes ?? 5,
		wrapUpMinutes:  settings?.wrapUpMinutes  ?? 2,
	};

	// Enforce strict hierarchy so the timer always makes sense
	if (config.warningMinutes >= config.targetMinutes) {
		config.warningMinutes = Math.round(config.targetMinutes * 0.2);
	}
	if (config.wrapUpMinutes >= config.warningMinutes) {
		config.wrapUpMinutes = Math.round(config.warningMinutes * 0.5);
	}

	const remainingSeconds = config.targetMinutes * 60 - elapsedSeconds;
	const isOvertime = remainingSeconds < 0;
	const status = getTimerStatus(elapsedSeconds, isActive, config);

	return (
		<div className={`ll-timer ll-timer--${status}`}>
			<div className="ll-timer-label">{LABELS[status]}</div>
			<div className="ll-timer-display">
				{isOvertime ? '+' : ''}{formatTime(remainingSeconds)}
			</div>
			<div className="ll-timer-target">Target: {config.targetMinutes}m</div>
		</div>
	);
};
