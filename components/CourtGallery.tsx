"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X, Maximize2 } from "lucide-react";

export type CourtMedia = {
  title: string;
  photo: string;
  alt: string;
  surface: string;
  video?: string;
  videoTitle?: string;
  source?: string;
  fact?: string;
  href?: string;
};
export default function CourtGallery({ items }: { items: CourtMedia[] }) {
  const [mode, setMode] = useState<"photos" | "videos">("photos");
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");
  const opened = useRef(false);
  useEffect(
    () => () => {
      if (opened.current)
        document.body.style.overflow = previousOverflow.current;
    },
    [],
  );
  const opener = useRef<HTMLButtonElement>(null);
  const available = items.filter((item) => mode === "photos" || item.video);
  const item = available[selected % available.length];
  if (!item) return null;
  const title = mode === "videos" ? item.videoTitle || item.title : item.title;
  const move = (delta: number) => {
    setSelected(
      (index) => (index + delta + available.length) % available.length,
    );
    setPlaying(false);
  };
  return (
    <section className="court-gallery" aria-labelledby="court-gallery-title">
      <div className="ds-section-heading">
        <h2 id="court-gallery-title">La historia de cada pista.</h2>
        <div
          className="gallery-modes"
          role="group"
          aria-label="Contenido de la galería"
        >
          {(["photos", "videos"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setSelected(0);
                setPlaying(false);
              }}
            >
              {value === "photos" ? "Fotografías" : "Vídeos"}
            </button>
          ))}
        </div>
      </div>
      <div className="court-gallery-stage" data-event-surface={item.surface}>
        {playing && item.video ? (
          <iframe
            key={item.video}
            src={`https://www.youtube-nocookie.com/embed/${item.video}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <Image
              key={item.photo}
              src={item.photo}
              alt={item.alt}
              fill
              sizes="(max-width:759px) 100vw, 1200px"
            />
            <div className="court-gallery-caption" aria-live="polite">
              <h3>{title}</h3>{mode === "photos" && item.fact && <p>{item.fact}</p>}{mode === "photos" && item.href && <a href={item.href}>Ver torneo y resultados</a>}
            </div>
            {mode === "videos" ? (
              <button
                type="button"
                className="gallery-play"
                aria-label={`Reproducir ${title}`}
                onClick={() => setPlaying(true)}
              >
                <Play size={28} fill="currentColor" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                ref={opener}
                className="gallery-expand"
                aria-label="Ampliar fotografía"
                onClick={() => {
                  previousOverflow.current = document.body.style.overflow;
                  opened.current = true;
                  document.body.style.overflow = "hidden";
                  dialog.current?.showModal();
                }}
              >
                <Maximize2 size={20} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>
      <div className="court-gallery-controls">
        <span>
          {(selected % available.length) + 1} / {available.length}
        </span>
        {mode === "videos" && item.source && (
          <a href={item.source} target="_blank" rel="noopener noreferrer">
            Ver en el canal oficial
          </a>
        )}
        <div>
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="court-gallery-dialog"
        aria-label={title}
        onClose={() => {
          document.body.style.overflow = previousOverflow.current;
          opened.current = false;
          opener.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          type="button"
          aria-label="Cerrar fotografía"
          onClick={() => dialog.current?.close()}
        >
          <X size={24} aria-hidden="true" />
        </button>
        <Image
          src={item.photo}
          alt={item.alt}
          width={1440}
          height={960}
          sizes="100vw"
        />
        <p>{title}</p>
      </dialog>
    </section>
  );
}
