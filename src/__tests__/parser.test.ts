import { describe, it, expect } from 'vitest';
import {
	parseMarkdownToSlides,
	countSpeakableWords,
	formatDuration,
} from '../lib/parser';

// ---------------------------------------------------------------------------
// Fixture strings mirroring the dev vault fixture notes
// ---------------------------------------------------------------------------

const FIXTURE_FULL = `:::lecturelight
target: 20
warning: 4
wrapUp: 2
:::

Opening remarks before any slides.

:::slide [Intro]
# Hello World
- Point one
- Point two
:::

Notes between slide one and two.

:::slide [Image Test] bleed
![[test-image.png]]
:::

Closing remarks after all slides.
`;

const FIXTURE_NOTES_ONLY = `:::lecturelight
target: 10
warning: 2
wrapUp: 1
:::

This is a talk with no slides. Just spoken notes.
More spoken notes here.
`;

const FIXTURE_NO_CONFIG = `:::slide [Slide One]
# No Config Here
:::
`;

const FIXTURE_PLAIN = `# My Regular Note
Just normal Obsidian content. No plugin activation expected.
`;

const FIXTURE_EDGE_CASES = `:::lecturelight
target: 5
:::

:::slide
# Slide with no label
:::

:::slide [Empty Slide]
:::

:::slide [Wikilink Image]
![alt](vault-resolved/test-image.png)
:::

:::slide [Auto-bleed]
![photo](photo.jpg)
Some text after the image.
:::

:::slide [Standard text]
# Just a heading
:::
`;

// ---------------------------------------------------------------------------
// parseMarkdownToSlides
// ---------------------------------------------------------------------------

describe('parseMarkdownToSlides', () => {

	describe('empty and trivial input', () => {
		it('returns empty slides and null timerSettings for an empty string', () => {
			const result = parseMarkdownToSlides('');
			expect(result.slides).toHaveLength(0);
			expect(result.timerSettings).toBeNull();
		});

		it('returns empty slides and null timerSettings for a plain note', () => {
			const result = parseMarkdownToSlides(FIXTURE_PLAIN);
			expect(result.slides).toHaveLength(0);
			expect(result.timerSettings).toBeNull();
		});

		it('returns empty slides when only a config block is present', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_ONLY);
			expect(result.slides).toHaveLength(0);
		});
	});

	describe(':::lecturelight config block', () => {
		it('extracts all three timer values', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.timerSettings).not.toBeNull();
			expect(result.timerSettings?.targetMinutes).toBe(20);
			expect(result.timerSettings?.warningMinutes).toBe(4);
			expect(result.timerSettings?.wrapUpMinutes).toBe(2);
		});

		it('returns null timerSettings when no :::lecturelight block exists', () => {
			const result = parseMarkdownToSlides(FIXTURE_NO_CONFIG);
			expect(result.timerSettings).toBeNull();
		});

		it('falls back to default wrapUp (2) when field is missing from config', () => {
			// FIXTURE_EDGE_CASES config has only "target: 5", no warning or wrapUp
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			expect(result.timerSettings?.targetMinutes).toBe(5);
			expect(result.timerSettings?.warningMinutes).toBe(5);   // default
			expect(result.timerSettings?.wrapUpMinutes).toBe(2);    // default
		});

		it('does NOT include config block text in any slide notes', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			for (const slide of result.slides) {
				expect(slide.notes).not.toContain(':::lecturelight');
				expect(slide.notes).not.toContain('target:');
				expect(slide.notes).not.toContain('warning:');
				expect(slide.notes).not.toContain('wrapUp:');
			}
		});
	});

	describe('slide parsing', () => {
		it('parses two slides from the full fixture', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides).toHaveLength(2);
		});

		it('parses one slide from the no-config fixture', () => {
			const result = parseMarkdownToSlides(FIXTURE_NO_CONFIG);
			expect(result.slides).toHaveLength(1);
		});

		it('preserves slide labels', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.label).toBe('Intro');
			expect(result.slides[1]?.label).toBe('Image Test');
		});

		it('auto-generates a label when none is provided', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			// First slide has no label in the markdown
			expect(result.slides[0]?.label).toBe('Slide 1');
		});

		it('produces non-empty htmlContent for a slide with markdown', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.htmlContent).toContain('Hello World');
		});

		it('produces empty rawMarkdown for an empty slide body', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			const emptySlide = result.slides.find(s => s.label === 'Empty Slide');
			expect(emptySlide).toBeDefined();
			expect(emptySlide?.rawMarkdown).toBe('');
		});

		it('assigns each slide a unique id', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			const ids = result.slides.map(s => s.id);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe('teleprompter notes', () => {
		it('assigns opening prose to the first slide notes', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.notes).toContain('Opening remarks before any slides.');
		});

		it('assigns prose between slides to the following slide notes', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[1]?.notes).toContain('Notes between slide one and two.');
		});

		it('does not carry prose from one slide into another', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.notes).not.toContain('Notes between slide one and two.');
			expect(result.slides[1]?.notes).not.toContain('Opening remarks');
		});
	});

	describe('layout detection', () => {
		it('assigns standard layout by default', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.layout).toBe('standard');
		});

		it('assigns bleed layout when the bleed keyword is present', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[1]?.layout).toBe('bleed');
		});

		it('auto-detects bleed when the first content line is an image', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			const autoBleed = result.slides.find(s => s.label === 'Auto-bleed');
			expect(autoBleed?.layout).toBe('bleed');
		});

		it('does not assign bleed to a slide whose first line is a heading', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			const standardSlide = result.slides.find(s => s.label === 'Standard text');
			expect(standardSlide?.layout).toBe('standard');
		});
	});

	describe('media extraction', () => {
		it('extracts an image into the media array', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			const mediaSlide = result.slides.find(s => s.label === 'Wikilink Image');
			expect(mediaSlide?.media).toHaveLength(1);
			expect(mediaSlide?.media[0]?.type).toBe('image');
			expect(mediaSlide?.media[0]?.originalSrc).toBe('vault-resolved/test-image.png');
		});

		it('includes an img tag in htmlContent for a slide with an image', () => {
			const result = parseMarkdownToSlides(FIXTURE_EDGE_CASES);
			const mediaSlide = result.slides.find(s => s.label === 'Wikilink Image');
			expect(mediaSlide?.htmlContent).toContain('<img');
		});

		it('returns an empty media array for a slide with no images', () => {
			const result = parseMarkdownToSlides(FIXTURE_FULL);
			expect(result.slides[0]?.media).toHaveLength(0);
		});
	});

	describe(':::notes speaker notes', () => {
		const FIXTURE_NOTES_POSITIONAL = `:::slide [Intro]
# Hello
:::

:::notes
These are positional notes for the intro slide.
:::

:::slide [Second]
# Second
:::
`;

		const FIXTURE_NOTES_LABELED = `:::slide [Intro]
# Hello
:::

:::slide [Second]
# Second
:::

:::notes [Intro]
Label-matched notes for intro.
:::
`;

		it('assigns positional :::notes to the preceding slide', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_POSITIONAL);
			expect(result.slides[0]?.speakerNotesHtml).toBeDefined();
			expect(result.slides[0]?.speakerNotesHtml).toContain('positional notes');
		});

		it('does not assign positional notes to a slide that did not precede the block', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_POSITIONAL);
			expect(result.slides[1]?.speakerNotesHtml).toBeUndefined();
		});

		it('assigns label-matched :::notes [Label] to the correct slide', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_LABELED);
			expect(result.slides[0]?.speakerNotesHtml).toBeDefined();
			expect(result.slides[0]?.speakerNotesHtml).toContain('Label-matched');
		});

		it('does not set speakerNotesHtml on unmatched slides', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_LABELED);
			expect(result.slides[1]?.speakerNotesHtml).toBeUndefined();
		});

		it('does not include :::notes content in slide teleprompter notes', () => {
			const result = parseMarkdownToSlides(FIXTURE_NOTES_POSITIONAL);
			expect(result.slides[0]?.notes).not.toContain('positional notes');
		});
	});

	describe('robustness', () => {
		it('does not crash or loop on an unclosed :::slide block', () => {
			const input = `:::slide [Unclosed]\n# Content with no closing fence`;
			expect(() => parseMarkdownToSlides(input)).not.toThrow();
		});

		it('returns zero slides for an unclosed block (nothing to flush)', () => {
			const input = `:::slide [Unclosed]\n# Content with no closing fence`;
			const result = parseMarkdownToSlides(input);
			expect(result.slides).toHaveLength(0);
		});

		it('handles a note with only whitespace', () => {
			const result = parseMarkdownToSlides('   \n\n\t\n');
			expect(result.slides).toHaveLength(0);
			expect(result.timerSettings).toBeNull();
		});
	});
});

// ---------------------------------------------------------------------------
// countSpeakableWords
// ---------------------------------------------------------------------------

describe('countSpeakableWords', () => {
	it('returns 0 for an empty string', () => {
		expect(countSpeakableWords('')).toBe(0);
	});

	it('counts words in plain prose', () => {
		expect(countSpeakableWords('Hello world this is a test')).toBe(6);
	});

	it('does not count words inside :::slide blocks', () => {
		const input = `Before the slide.\n:::slide\n# Inside the slide\n:::\nAfter the slide.`;
		// "Before the slide." = 3 words, "After the slide." = 3 words = 6 total
		expect(countSpeakableWords(input)).toBe(6);
	});

	it('does not count words inside :::lecturelight config blocks', () => {
		const input = `:::lecturelight\ntarget: 30\nwarning: 5\n:::\nSpoken intro.`;
		expect(countSpeakableWords(input)).toBe(2); // "Spoken intro."
	});

	it('does not count words inside :::notes blocks', () => {
		const input = `Before.\n:::notes\nThis should not count.\n:::\nAfter.`;
		// "Before." = 1, "After." = 1
		expect(countSpeakableWords(input)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
	it('formats minutes under 60 as "~N min"', () => {
		expect(formatDuration(30)).toBe('~30 min');
		expect(formatDuration(5)).toBe('~5 min');
	});

	it('formats 60+ minutes as "~Xh Ymin"', () => {
		expect(formatDuration(90)).toBe('~1h 30min');
		expect(formatDuration(120)).toBe('~2h 0min');
	});

	it('rounds fractional minutes', () => {
		expect(formatDuration(30.4)).toBe('~30 min');
		expect(formatDuration(30.6)).toBe('~31 min');
	});
});
