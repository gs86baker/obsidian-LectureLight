import React from 'react';
import { TimerSettings } from '../types';

interface TrafficLightTimerProps {
	elapsedSeconds: number;
	isActive: boolean;
	settings?: TimerSettings;
	errorMessage?: string | null;
	showTimePlaceholder?: boolean;
	children?: React.ReactNode;
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
	// On initial load (not running, no elapsed time), show the timer in green.
	if (!isActive && elapsedSeconds === 0) return 'green';
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
	errorMessage,
	showTimePlaceholder = false,
	children,
}) => {
	const config = {
		targetMinutes:  settings?.targetMinutes  ?? 30,
		warningMinutes: settings?.warningMinutes ?? 5,
		wrapUpMinutes:  settings?.wrapUpMinutes  ?? 2,
	};

	const remainingSeconds = config.targetMinutes * 60 - elapsedSeconds;
	const isOvertime = remainingSeconds < 0;
	const status = showTimePlaceholder
		? 'green'
		: getTimerStatus(elapsedSeconds, isActive, config);
	const timeDisplay = showTimePlaceholder
		? '---:--'
		: `${isOvertime ? '+' : ''}${formatTime(remainingSeconds)}`;
	const targetText = showTimePlaceholder
		? 'Target: --'
		: `Target: ${config.targetMinutes}m`;
	const warningText = showTimePlaceholder
		? 'Warning: --'
		: `Warning: ${config.warningMinutes}m`;
	const wrapUpText = showTimePlaceholder
		? 'Wrap-up: --'
		: `Wrap-up: ${config.wrapUpMinutes}m`;

	return (
		<div className={`ll-timer ll-timer--${status}`}>
			<div className="ll-timer-main">
				<div className="ll-timer-display">{timeDisplay}</div>
				<div className="ll-timer-label">{LABELS[status]}</div>
			</div>

			<div className="ll-timer-target">
				{targetText} · {warningText} · {wrapUpText}
			</div>
			{errorMessage ? <div className="ll-timer-error">{errorMessage}</div> : null}

			{children ? <div className="ll-timer-extra">{children}</div> : null}
		</div>
	);
};
