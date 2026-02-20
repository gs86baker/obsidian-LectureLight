export interface Slide {
	id: string;
	label?: string;
	rawMarkdown: string;   // Content inside :::slide ... ::: delimiters
	htmlContent: string;   // DOMPurify-sanitized HTML
	notes: string;         // Teleprompter script preceding this slide
	media: MediaAsset[];
	layout: 'standard' | 'bleed';
}

export interface MediaAsset {
	id: string;
	originalSrc: string;   // As written in markdown (resolved by wikilink pre-processor)
	type: 'image';
}

export interface TimerSettings {
	targetMinutes: number;
	warningMinutes: number;
	wrapUpMinutes: number;
}

export interface ParseResult {
	slides: Slide[];
	timerSettings: TimerSettings | null;  // null when no :::lecturelight block found
}
