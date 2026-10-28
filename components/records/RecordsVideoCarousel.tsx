"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const videos = [
  {
    id: "jUgyaoew8as",
    title: "11 horas y 5 minutos",
    description: "Isner–Mahut, Wimbledon 2010. El partido más largo del archivo.",
    href: "https://www.youtube.com/watch?v=jUgyaoew8as",
  },
  {
    id: "f8YEiCAPAbg",
    title: "La final que acabó de noche",
    description: "Federer–Nadal, Wimbledon 2008. Cinco sets para cambiar la historia.",
    href: "https://www.youtube.com/watch?v=f8YEiCAPAbg",
  },
  {
    id: "mnLdAeSXZv0",
    title: "La final más larga de Wimbledon",
    description: "Djokovic–Federer, 2019. Cuatro horas y 57 minutos de tensión.",
    href: "https://www.youtube.com/watch?v=mnLdAeSXZv0",
  },
] as const;

export default function RecordsVideoCarousel() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const video = videos[active];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "160px 0px", threshold: 0.12 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const move = (direction: -1 | 1) => {
    setActive(
      (current) => (current + direction + videos.length) % videos.length,
    );
  };

  return (
    <section
      ref={rootRef}
      className="records-video-carousel"
      aria-labelledby="records-video-title"
    >
      <div
        className="records-video-media"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(1, 14, 10, .9), rgba(1, 14, 10, .08) 70%), url(https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg)`,
        }}
      >
        {visible ? (
          <iframe
            key={video.id}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${video.id}&playsinline=1&rel=0`}
            title={video.title}
            loading="eager"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : null}
      </div>
      <div className="records-video-copy">
        <h2 id="records-video-title">{video.title}</h2>
        <p>{video.description}</p>
        <a href={video.href} target="_blank" rel="noreferrer">
          Ver vídeo oficial de Wimbledon
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
      <div className="records-video-controls" aria-label="Controles del carrusel">
        <button type="button" onClick={() => move(-1)} aria-label="Vídeo anterior">
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <div className="records-video-dots" role="group" aria-label="Elegir vídeo">
          {videos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Mostrar vídeo: ${item.title}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="Vídeo siguiente">
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
