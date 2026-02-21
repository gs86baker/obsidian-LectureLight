import React from 'react';
import { Slide } from '../types';

interface FilmStripProps {
	slides: Slide[];
	currentSlideIndex: number;
	onSlideSelect: (index: number) => void;
}

export const FilmStrip: React.FC<FilmStripProps> = ({ slides, currentSlideIndex, onSlideSelect }) => {
	if (slides.length === 0) return null;

	return (
		<div className="ll-filmstrip" role="list" aria-label="Slide thumbnails">
			{slides.map((slide, index) => (
				<div
					key={slide.id}
					role="button"
					tabIndex={0}
					className={`ll-filmstrip-item${index === currentSlideIndex ? ' ll-filmstrip-item--active' : ''}`}
					onClick={() => onSlideSelect(index)}
					onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSlideSelect(index); }}
					aria-label={`Go to slide ${index + 1}: ${slide.label ?? ''}`}
					aria-current={index === currentSlideIndex ? 'true' : undefined}
					title={slide.label ?? `Slide ${index + 1}`}
				>
					<div className="ll-filmstrip-thumb">
						<div
							className={`ll-filmstrip-thumb-inner ll-layout-${slide.layout}`}
							dangerouslySetInnerHTML={{ __html: slide.htmlContent }}
						/>
					</div>
					<span className="ll-filmstrip-label">
						{index + 1}. {slide.label ?? `Slide ${index + 1}`}
					</span>
				</div>
			))}
		</div>
	);
};
