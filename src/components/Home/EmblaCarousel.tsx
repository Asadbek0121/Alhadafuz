"use client";

import { useRef, useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import styles from './EmblaCarousel.module.css';

interface EmblaCarouselProps {
    slides: React.ReactNode[];
    /** Shows arrow buttons (prev/next). Default: false */
    showArrows?: boolean;
    /** Shows dot indicators. Default: false */
    showDots?: boolean;
    /** Additional classes for the root wrapper. */
    className?: string;
    /**
     * Slide basis size controlling visible cards.
     * Pass a responsive Tailwind class string matching grid column widths.
     * Example: "w-[50%] md:w-[33%] lg:w-[24%] xl:w-[20%]"
     */
    slideClass?: string;
    /**
     * Gap between slides — must match the grid gap in the sibling section.
     * Pass Tailwind gap class like "gap-3 md:gap-6".
     * Applied to the root wrapper.
     */
    slideGap?: string;
}

/**
 * Reusable Embla carousel component.
 * No autoplay — drag/swipe only.
 * Arrow and dot controls are optional via props.
 */
export default function EmblaCarousel({
    slides,
    showArrows = false,
    showDots = false,
    className = '',
    slideClass = '',
    slideGap = '',
}: EmblaCarouselProps) {
    const [emblaNode, embla] = useEmblaCarousel(
        {
            align: 'start' as const,
            loop: false,
            containScroll: 'trimSnaps' as const,
            dragFree: false,
            duration: 500,
            startIndex: 0,
            dragThreshold: 10,
        },
        []
    );

    // Add data-embla attribute to root for cursor styling
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        root.setAttribute('data-embla', '');
        const onDragStart = () => root.classList.add('is-dragging');
        const onDragEnd = () => root.classList.remove('is-dragging');
        root.addEventListener('pointerdown', onDragStart);
        root.addEventListener('pointerup', onDragEnd);
        root.addEventListener('pointerleave', onDragEnd);
        return () => {
            root.removeEventListener('pointerdown', onDragStart);
            root.removeEventListener('pointerup', onDragEnd);
            root.removeEventListener('pointerleave', onDragEnd);
        };
    }, []);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const onSelect = useCallback((api: EmblaCarouselType) => {
        setSelectedIndex(api.selectedScrollSnap());
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);

    const onInit = useCallback((api: EmblaCarouselType) => {
        setScrollSnaps(api.scrollSnapList());
        setSelectedIndex(api.selectedScrollSnap());
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);

    useEffect(() => {
        if (!embla) return;
        onInit(embla);
        embla.on('reInit', onInit);
        embla.on('select', onSelect);
    }, [embla, onInit, onSelect]);

    const prev = useCallback(() => embla?.scrollPrev(), [embla]);
    const next = useCallback(() => embla?.scrollNext(), [embla]);

    return (
        <div ref={rootRef} className={`${styles.emblaRoot} ${className} ${slideGap}`}>
            {/* Arrows — positioned absolutely on emblaRoot, outside overflow:hidden */}
            {showArrows && (
                <div className={styles.emblaArrows}>
                    <button
                        type="button"
                        className={styles.emblaArrow}
                        onClick={prev}
                        disabled={!canScrollPrev}
                        aria-label="Oldingi"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={styles.emblaArrow}
                        onClick={next}
                        disabled={!canScrollNext}
                        aria-label="Keyingi"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Embla viewport — overflow:hidden */}
            <div ref={emblaNode} className={styles.emblaViewport}>
                {/* Embla track — negative margin for edge slides */}
                <div className={styles.emblaTrack}>
                    {slides.map((slide, i) => (
                        <div key={i} className={`${styles.emblaSlide} ${slideClass}`.trim()}>
                            {slide}
                        </div>
                    ))}
                </div>
            </div>

            {/* Dots — show when more than 1 snap */}
            {showDots && scrollSnaps.length > 1 && (
                <div className={styles.emblaDots}>
                    {scrollSnaps.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`${styles.emblaDot} ${i === selectedIndex ? styles.emblaDotSelected : ''}`}
                            onClick={() => embla?.scrollTo(i)}
                            aria-label={`${i + 1}-sahifaga o'tish`}
                            aria-current={i === selectedIndex}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
