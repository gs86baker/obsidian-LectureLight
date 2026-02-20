import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Slide, ParseResult } from '../types';

// Harden DOMPurify: add rel="noopener noreferrer" to all links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.tagName === 'A') {
		node.setAttribute('rel', 'noopener noreferrer');
	}
});

const escapeHtml = (str: string): string => {
	const htmlEscapes: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	};
	return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
};

/**
 * Counts speakable words in the teleprompter script (prose between :::slide blocks).
 * Excludes slide content and :::lecturelight config blocks.
 */
export function countSpeakableWords(markdown: string): number {
	if (!markdown) return 0;

	const lines = markdown.split('\n');
	let mode: 'NOTES' | 'SLIDE' | 'CONFIG' | 'SPEAKER_NOTES' = 'NOTES';
	const notesText: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (mode === 'NOTES') {
			if (trimmed.match(/^:::\s*slide/)) {
				mode = 'SLIDE';
			} else if (trimmed.match(/^:::\s*lecturelight/)) {
				mode = 'CONFIG';
			} else if (trimmed.match(/^:::\s*notes/)) {
				mode = 'SPEAKER_NOTES';
			} else {
				notesText.push(line);
			}
		} else if (mode === 'CONFIG' || mode === 'SLIDE' || mode === 'SPEAKER_NOTES') {
			if (trimmed === ':::') mode = 'NOTES';
		}
	}

	const fullText = notesText.join('\n').trim();
	return fullText.split(/\s+/).filter(Boolean).length;
}

/**
 * Formats a duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `~${Math.round(minutes)} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	return `~${hours}h ${mins}min`;
}

/**
 * Parses a markdown string containing :::slide and :::lecturelight blocks.
 *
 * Syntax:
 *   :::lecturelight
 *   target: 30
 *   warning: 5
 *   wrapUp: 2
 *   :::
 *
 *   Teleprompter prose before slide one...
 *
 *   :::slide [Optional Label]
 *   # Slide content
 *   :::
 *
 *   :::slide [Bleed slide] bleed
 *   ![[FullBleedImage.png]]
 *   :::
 *
 * Returns:
 *   - slides: parsed Slide array
 *   - timerSettings: parsed from :::lecturelight block, or null if no block found
 */
export function parseMarkdownToSlides(markdown: string): ParseResult {
	if (!markdown) return { slides: [], timerSettings: null };

	const lines = markdown.split('\n');
	const slides: Slide[] = [];

	// Extract :::lecturelight config block
	let timerSettings: ParseResult['timerSettings'] = null;
	const configRegex = /:::lecturelight\s*([\s\S]*?)\s*:::/;
	const configMatch = markdown.match(configRegex);

	if (configMatch) {
		const configBody = configMatch[1] ?? '';
		const getVal = (pattern: RegExp): number | null => {
			const m = configBody.match(pattern);
			return m ? parseFloat(m[1] ?? '') : null;
		};

		const target = getVal(/target(?:Minutes)?:\s*(\d+(\.\d+)?)/i);
		const warning = getVal(/warning(?:Minutes)?:\s*(\d+(\.\d+)?)/i);
		const wrapUp = getVal(/wrapUp(?:Minutes)?:\s*(\d+(\.\d+)?)/i);

		timerSettings = {
			targetMinutes: target ?? 30,
			warningMinutes: warning ?? 5,
			wrapUpMinutes: wrapUp ?? 2,
		};
	}

	// State machine: NOTES collects teleprompter prose, SLIDE collects slide content,
	// CONFIG silently consumes the :::lecturelight block (already extracted via regex),
	// SPEAKER_NOTES collects presenter-only notes attached to a slide
	let mode: 'NOTES' | 'SLIDE' | 'CONFIG' | 'SPEAKER_NOTES' = 'NOTES';
	let currentNotes: string[] = [];
	let currentSlideRaw: string[] = [];
	let currentSlideLabel = '';
	let currentSlideBleed = false;
	let currentNotesRaw: string[] = [];
	let currentNotesLabel = '';
	const speakerNotesMap = new Map<string, string>();

	const flushSpeakerNotes = () => {
		const raw = currentNotesRaw.join('\n').trim();
		if (raw) {
			const html = DOMPurify.sanitize(marked.parse(raw) as string);
			if (currentNotesLabel) {
				speakerNotesMap.set(currentNotesLabel, html);
			} else if (slides.length > 0) {
				slides[slides.length - 1]!.speakerNotesHtml = html;
			}
		}
		currentNotesRaw = [];
		currentNotesLabel = '';
	};

	const flushSlide = () => {
		const rawContent = currentSlideRaw.join('\n').trim();

		// Extract image sources for media tracking
		const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
		const media: Slide['media'] = [];
		let imageMatch;
		while ((imageMatch = imageRegex.exec(rawContent)) !== null) {
			media.push({
				id: crypto.randomUUID(),
				originalSrc: imageMatch[2] ?? '',
				type: 'image',
			});
		}

		// Auto-detect bleed: explicit keyword OR first content line is an image
		const firstContentLine = rawContent.trimStart().split('\n')[0] ?? '';
		const isBleed = currentSlideBleed || /^!\[/.test(firstContentLine);

		const label = currentSlideLabel || `Slide ${slides.length + 1}`;

		slides.push({
			id: crypto.randomUUID(),
			label,
			rawMarkdown: rawContent,
			htmlContent: DOMPurify.sanitize(marked.parse(rawContent) as string),
			notes: currentNotes.join('\n').trim(),
			media,
			layout: isBleed ? 'bleed' : 'standard',
		});

		currentNotes = [];
		currentSlideRaw = [];
		currentSlideLabel = '';
		currentSlideBleed = false;
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (mode === 'NOTES') {
			// Match: :::slide [Optional Label] [bleed]
			const slideStart = trimmed.match(/^:::\s*slide(?:\s*\[([^\]]*)\])?(?:\s+(bleed))?/);
			const configStart = trimmed.match(/^:::\s*lecturelight/);
			const notesStart = trimmed.match(/^:::\s*notes(?:\s*\[([^\]]*)\])?/);
			if (slideStart) {
				mode = 'SLIDE';
				currentSlideLabel = slideStart[1] ?? '';
				currentSlideBleed = slideStart[2] === 'bleed';
			} else if (configStart) {
				// Silently consume the config block — values already extracted via regex above
				mode = 'CONFIG';
			} else if (notesStart) {
				mode = 'SPEAKER_NOTES';
				currentNotesLabel = notesStart[1] ?? '';
				currentNotesRaw = [];
			} else {
				currentNotes.push(line);
			}
		} else if (mode === 'CONFIG') {
			if (trimmed === ':::') mode = 'NOTES';
		} else if (mode === 'SLIDE') {
			if (trimmed === ':::') {
				flushSlide();
				mode = 'NOTES';
			} else {
				currentSlideRaw.push(line);
			}
		} else if (mode === 'SPEAKER_NOTES') {
			if (trimmed === ':::') {
				flushSpeakerNotes();
				mode = 'NOTES';
			} else {
				currentNotesRaw.push(line);
			}
		}
	}

	// Assign label-matched speaker notes to slides
	for (const [label, html] of speakerNotesMap.entries()) {
		const slide = slides.find(s => s.label === label);
		if (slide) slide.speakerNotesHtml = html;
	}

	return { slides, timerSettings };
}

/**
 * Generates a preview HTML string for the editor.
 * Notes are rendered as prose; slide blocks are replaced with visual placeholders.
 * NOTE: Uses CSS class names from the original LecturerLight design.
 * These will be replaced with scoped plugin styles in Phase C.
 */
export function generateDocumentPreview(_slides: Slide[], rawText: string): string {
	const lines = rawText.split('\n');
	let html = '';
	let mode: 'NOTES' | 'SLIDE' | 'CONFIG' = 'NOTES';
	let buffer: string[] = [];
	let slideLabel = '';

	const flushNotes = () => {
		if (buffer.length === 0) return;
		const text = buffer.join('\n').trim();
		if (text) {
			html += `<div class="notes-section mb-6">${DOMPurify.sanitize(marked.parse(text) as string)}</div>`;
		}
		buffer = [];
	};

	const renderSlidePlaceholder = (label: string) => {
		html += `
      <div class="slide-placeholder my-8 p-4 bg-slate-800 border-l-4 border-blue-500 rounded-r-lg shadow-md">
        <div class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Slide trigger</div>
        <div class="font-bold text-white text-lg"># ${escapeHtml(label)}</div>
      </div>
    `;
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (mode === 'NOTES') {
			const slideStart = trimmed.match(/^:::\s*slide(?:\s*\[([^\]]*)\])?/);
			const configStart = trimmed.match(/^:::\s*lecturelight/);

			if (slideStart) {
				flushNotes();
				mode = 'SLIDE';
				slideLabel = slideStart[1] ?? 'Slide';
				renderSlidePlaceholder(slideLabel);
			} else if (configStart) {
				flushNotes();
				mode = 'CONFIG';
			} else {
				buffer.push(line);
			}
		} else if (mode === 'CONFIG') {
			if (trimmed === ':::') mode = 'NOTES';
		} else if (mode === 'SLIDE') {
			if (trimmed === ':::') mode = 'NOTES';
		}
	}

	flushNotes();
	return html;
}

/**
 * Generates the interactive teleprompter HTML.
 * Notes are rendered as prose; each :::slide block becomes a clickable trigger button.
 * NOTE: Uses CSS class names from the original LecturerLight design.
 * These will be replaced with scoped plugin styles in Phase C.
 */
export function generateInteractiveScript(_slides: Slide[], rawText: string, activeIndex = -1): string {
	const lines = rawText.split('\n');
	let html = '';
	let mode: 'NOTES' | 'SLIDE' | 'CONFIG' = 'NOTES';
	let buffer: string[] = [];
	let slideIndex = 0;
	let slideLabel = '';
	let slideContentBuffer: string[] = [];

	const flushNotes = () => {
		if (buffer.length === 0) return;
		const text = buffer.join('\n');
		if (text.trim()) {
			html += `<div class="notes-section mb-8">${DOMPurify.sanitize(marked.parse(text) as string)}</div>`;
		}
		buffer = [];
	};

	const renderSlideTrigger = (label: string, contentSnippet: string, index: number) => {
		const isActive = index === activeIndex;

		const stateClasses = isActive
			? 'border-blue-500 bg-blue-950 ring-2 ring-blue-500/50'
			: 'bg-slate-900 border-slate-700 hover:bg-slate-800';
		const labelClass = isActive ? 'text-blue-300 font-black' : 'text-slate-500';
		const titleClass = isActive ? 'text-white' : 'text-slate-300';
		const snippetClass = isActive
			? 'text-blue-200 bg-blue-900/50 border-blue-500/30'
			: 'bg-black/30 border-white/5 text-slate-500';

		html += `
      <div class="slide-trigger-wrapper my-8" id="slide-trigger-${index}">
        <button
          class="slide-trigger-btn w-full text-left rounded-r-xl p-6 border-l-4 ${stateClasses}"
          data-slide-index="${index}"
        >
          <div class="text-xs font-black uppercase tracking-widest mb-1 ${labelClass}">Push to stage</div>
          <div class="font-bold text-2xl ${titleClass}">${escapeHtml(label)}</div>
          <div class="mt-4 p-3 rounded border text-xs font-mono overflow-hidden whitespace-nowrap text-ellipsis ${snippetClass}">
            ${escapeHtml(contentSnippet.substring(0, 100).replace(/\n/g, ' '))}...
          </div>
        </button>
      </div>
    `;
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (mode === 'NOTES') {
			const slideStart = trimmed.match(/^:::\s*slide(?:\s*\[([^\]]*)\])?/);
			const configStart = trimmed.match(/^:::\s*lecturelight/);

			if (slideStart) {
				flushNotes();
				mode = 'SLIDE';
				slideLabel = slideStart[1] ?? `Slide ${slideIndex + 1}`;
				slideContentBuffer = [];
			} else if (configStart) {
				flushNotes();
				mode = 'CONFIG';
			} else {
				buffer.push(line);
			}
		} else if (mode === 'CONFIG') {
			if (trimmed === ':::') mode = 'NOTES';
		} else if (mode === 'SLIDE') {
			if (trimmed === ':::') {
				const snippet = slideContentBuffer.join('\n').trim();
				renderSlideTrigger(slideLabel, snippet, slideIndex);
				slideIndex++;
				mode = 'NOTES';
			} else {
				slideContentBuffer.push(line);
			}
		}
	}

	flushNotes();
	return html;
}
