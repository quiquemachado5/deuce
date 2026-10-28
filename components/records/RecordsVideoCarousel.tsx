"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

const videos = [
  {
    id: "jUgyaoew8as",
    start: 73,
    end: 103,
    source: "Wimbledon",
    title: "11 horas y 5 minutos",
    description: "Isner–Mahut, Wimbledon 2010. El partido más largo del archivo.",
    href: "https://www.youtube.com/watch?v=jUgyaoew8as",
  },
  {
    id: "S1NvoFyU22Q",
    start: 16,
    end: 42,
    source: "US Open",
    title: "5 horas y 35 minutos",
    description: "Evans–Khachanov, US Open 2024. El partido más largo de Nueva York.",
    href: "https://www.youtube.com/watch?v=S1NvoFyU22Q",
  },
  {
    id: "bEPfMTfilIQ",
    start: 44,
    end: 74,
    source: "Roland-Garros",
    title: "14 títulos en París",
    description: "Nadal–Djokovic, Roland-Garros 2022. El camino hacia su decimocuarta copa.",
    href: "https://www.youtube.com/watch?v=bEPfMTfilIQ",
  },
] as const;

export default function RecordsVideoCarousel() {
  const [active, setActive] = useState(0);
  const video = videos[active];

  const move = (direction: -1 | 1) => {
    setActive(
      (current) => (current + direction + videos.length) % videos.length,
    );
  };

  return (
    <section
      className="records-video-carousel"
      aria-labelledby="records-video-title"
    >
      <div className="records-video-media">
        <iframe
          key={video.id}
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${video.id}&playsinline=1&rel=0&iv_load_policy=3&cc_load_policy=0&start=${video.start}&end=${video.end}`}
          title={video.title}
          loading="eager"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="records-video-copy">
        <h2 id="records-video-title">{video.title}</h2>
        <p>{video.description}</p>
        <a href={video.href} target="_blank" rel="noreferrer">
          Ver vídeo oficial de {video.source}
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
