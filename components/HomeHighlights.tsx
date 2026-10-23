"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type HomeHighlight = {
  id: string;
  title: string;
  name: string;
  value: string;
  detail: string;
  sample: string;
  href: string;
  photo?: { src: string; alt: string };
};

export default function HomeHighlights({
  slides,
}: {
  slides: HomeHighlight[];
}) {
  const [selected, setSelected] = useState(0);
  if (!slides.length) return null;
  const current = slides[selected];
  const supporting = slides.filter((story) => story.id !== current.id).slice(0, 4);
  const valueParts = current.value.match(/^([\d.,]+)\s+(.+)$/);
  return (
    <section className="ds-stories" aria-labelledby="ds-stories-title">
      <div className="ds-section-heading">
        <h2 id="ds-stories-title">Récords</h2>
        <Link href="/records">Ver todos</Link>
      </div>
      <div className="ds-discovery-stage">
        <div
          className="ds-discovery-copy"
          key={current.id}
          data-discovery-id={current.id}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="ds-discovery-category">{current.title}</span>
          <strong className="ds-discovery-number">
            {valueParts ? (
              <>
                <span>{valueParts[1]}</span>
                <span className="ds-discovery-unit"> {valueParts[2]}</span>
              </>
            ) : (
              current.value
            )}
          </strong>
          <h3>{current.name}</h3>
          <p>{current.detail.replace(/^\d[\d.,]*\s+/, '')}</p>
          <Link href={current.href}>Ver récord <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {current.photo && (
          <div className="ds-discovery-photo" key={current.photo.src}>
            <Image
              src={current.photo.src}
              alt={current.photo.alt}
              fill
              sizes="(max-width:759px) 40vw, 360px"
              unoptimized
            />
          </div>
        )}
        <div className="ds-discovery-controls" aria-label="Navegar por los récords">
          <span>{selected + 1} de {slides.length}</span>
          <button type="button" aria-label="Récord anterior" onClick={() => setSelected(index => (index - 1 + slides.length) % slides.length)}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Récord siguiente" onClick={() => setSelected(index => (index + 1) % slides.length)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="ds-stories-list">
        {supporting.map((story) => (
          <Link className="ds-story" href={story.href} key={story.id} data-story-id={story.id}>
            <span className="ds-story-title">{story.title}</span>
            <strong>{story.value}</strong>
            <span className="ds-story-person">{story.name}<ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
