'use client';

import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import styles from './tournament-detail.module.css';

export type EditionInsightSlide =
  | {
      kind: 'photo';
      label: string;
      title: string;
      value: string;
      detail: string;
      image: { src: string; alt: string; objectPosition?: string };
    }
  | {
      kind: 'chart';
      label: string;
      title: string;
      detail: string;
      bars: { label: string; value: number; display: string }[];
    }
  | {
      kind: 'scale';
      label: string;
      title: string;
      value: string;
      detail: string;
      facts: { value: string; label: string }[];
    };

export default function EditionInsightsRail({ slides }: { slides: EditionInsightSlide[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) => {
    rail.current?.scrollBy({
      left: direction * Math.min(rail.current.clientWidth * 0.82, 760),
      behavior: 'smooth',
    });
  };

  if (!slides.length) return null;

  return (
    <section className={styles.editionRail} aria-labelledby="edition-rail-title">
      <header className={styles.editionRailHead}>
        <h3 id="edition-rail-title">La edición en movimiento</h3>
        <div>
          <button type="button" onClick={() => move(-1)} aria-label="Ver lectura anterior">
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Ver lectura siguiente">
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className={styles.editionRailTrack} ref={rail} tabIndex={0}>
        {slides.map((slide, index) => (
          <article className={styles.editionRailSlide} data-kind={slide.kind} key={`${slide.label}-${index}`}>
            {slide.kind === 'photo' ? (
              <>
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  fill
                  sizes="(max-width: 759px) 86vw, 58vw"
                  style={{ objectFit: 'cover', objectPosition: slide.image.objectPosition || 'center top' }}
                  unoptimized
                />
                <span className={styles.editionRailShade} aria-hidden="true" />
                <div className={styles.editionRailPhotoCopy}>
                  <span>{slide.label}</span>
                  <strong>{slide.title}</strong>
                  <div><b>{slide.value}</b><small>{slide.detail}</small></div>
                </div>
              </>
            ) : null}
            {slide.kind === 'chart' ? (
              <div className={styles.editionRailChart}>
                <span>{slide.label}</span>
                <h4>{slide.title}</h4>
                <div>
                  {slide.bars.map((bar) => (
                    <div className={styles.editionRailBar} key={bar.label}>
                      <span><b>{bar.label}</b><strong>{bar.display}</strong></span>
                      <i aria-hidden="true"><em style={{ width: `${Math.max(4, bar.value)}%` }} /></i>
                    </div>
                  ))}
                </div>
                <p>{slide.detail}</p>
              </div>
            ) : null}
            {slide.kind === 'scale' ? (
              <div className={styles.editionRailScale}>
                <span>{slide.label}</span>
                <strong>{slide.value}</strong>
                <h4>{slide.title}</h4>
                <p>{slide.detail}</p>
                <dl>{slide.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
              </div>
            ) : null}
            <small className={styles.editionRailIndex}>{String(index + 1).padStart(2, '0')}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
