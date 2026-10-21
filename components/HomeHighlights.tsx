"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

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
  return (
    <section className="ds-stories" aria-labelledby="ds-stories-title">
      <div className="ds-section-heading">
        <h2 id="ds-stories-title">Siempre hay otro dato.</h2>
        <Link href="/records">Todas las estadísticas</Link>
      </div>
      <div className="ds-discovery-stage">
        <div
          className="ds-discovery-copy"
          key={current.id}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="ds-discovery-category">{current.title}</span>
          <strong className="ds-discovery-number">{current.value}</strong>
          <h3>{current.name}</h3>
          <p>{current.detail}</p>
          <span className="ds-discovery-sample">{current.sample}</span>
          <Link href={current.href}>Ver los partidos</Link>
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
        <button
          className="ds-discovery-next"
          type="button"
          onClick={() =>
            setSelected(
              (index) =>
                (index + 1 + Math.floor(Math.random() * (slides.length - 1))) %
                slides.length,
            )
          }
        >
          Otro dato <span aria-hidden="true">↻</span>
        </button>
      </div>
      <div className="ds-stories-list">
        {slides.map((story) => (
          <Link className="ds-story" href={story.href} key={story.id}>
            <span className="ds-story-title">{story.title}</span>
            <strong>{story.value}</strong>
            <span className="ds-story-person">{story.name}</span>
            <span className="ds-story-sample">{story.sample}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
