import React, { useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Slide } from '../types';

interface TeleprompterProps {
	slides: Slide[];
	currentSlideIndex: number;
	onSlideSelect: (index: number) => void;
	fontSize?: number;
}

export const Teleprompter = React.memo<TeleprompterProps>(function Teleprompter({
	slides,
	currentSlideIndex,
	onSlideSelect,
	fontSize = 18,
}) {
	const renderNotes = useCallback((notes: string): string => {
		if (!notes.trim()) return '';
		return DOMPurify.sanitize(marked.parse(notes) as string);
	}, []);

	return (
		<div className="ll-teleprompter" style={{ fontSize: `${fontSize}px` }}>
			{slides.map((slide, index) => (
				<React.Fragment key={slide.id}>
					{slide.notes && (
						<div
							className="ll-notes"
							dangerouslySetInnerHTML={{ __html: renderNotes(slide.notes) }}
						/>
					)}
					<div
						role="button"
						tabIndex={0}
						className={`ll-slide-trigger${index === currentSlideIndex ? ' ll-slide-trigger--active' : ''}`}
						onClick={() => onSlideSelect(index)}
						onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSlideSelect(index); }}
					>
						<span className="ll-slide-trigger-meta">Slide {index + 1} of {slides.length}</span>
						<span className="ll-slide-trigger-title">
							{slide.label ?? `Slide ${index + 1}`}
						</span>
						{slide.rawMarkdown && (
							<span className="ll-slide-trigger-snippet">
								{slide.rawMarkdown.substring(0, 100).replace(/\n/g, ' ')}
							</span>
						)}
					</div>
					{slide.speakerNotesHtml && (
						<div className="ll-speaker-notes">
							<span className="ll-speaker-notes-label">Speaker notes</span>
							<div
								className="ll-speaker-notes-body"
								dangerouslySetInnerHTML={{ __html: slide.speakerNotesHtml }}
							/>
						</div>
					)}
				</React.Fragment>
			))}
		</div>
	);
});
