"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type RecordsSurfaceSlide = {
  id: string;
  href: string;
  label: string;
  player: string;
  display: string;
  image: {
    src: string;
    alt: string;
    objectPosition?: string;
  };
};

export default function RecordsSurfaceSlider({
  slides,
}: {
  slides: RecordsSurfaceSlide[];
}) {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  if (!slide) return null;

  const move = (direction: -1 | 1) => {
    setActive((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section className="records-family-surface-slider" aria-label="Récords por superficie">
      <Link className="records-family-surface-slide" href={slide.href} key={slide.id}>
        <Image
          src={slide.image.src}
          alt={slide.image.alt}
          fill
          unoptimized
          sizes="(max-width: 759px) 100vw, 620px"
          style={{
            objectFit: "cover",
            objectPosition: slide.image.objectPosition || "50% 28%",
          }}
        />
        <span>
          <small>{slide.label}</small>
          <b>{slide.player}</b>
          <strong>{slide.display}</strong>
        </span>
      </Link>
      {slides.length > 1 ? (
        <div className="records-family-surface-controls" aria-label="Controles del carrusel">
          <button type="button" onClick={() => move(-1)} aria-label="Superficie anterior">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <span aria-hidden="true">
            {slides.map((item, index) => (
              <i key={item.id} data-active={index === active || undefined} />
            ))}
          </span>
          <button type="button" onClick={() => move(1)} aria-label="Superficie siguiente">
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
