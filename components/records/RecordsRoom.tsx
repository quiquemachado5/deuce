"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useRef, useState } from "react";
import styles from "@/app/records/records-index.module.css";

type RoomImage = { src: string; alt: string; objectPosition?: string };
type Surface = { label: string; value: string; name: string; sample: string; image: RoomImage };
export type RoomPiece = {
  id: string;
  metric: string;
  title: string;
  phrase: string;
  sample: string;
  chips: string[];
  image?: RoomImage;
  surfaces?: Surface[];
  pairImages?: RoomImage[];
  href: string;
  matchHref?: string;
  video?: boolean;
};

export default function RecordsRoom({ pieces }: { pieces: RoomPiece[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const piece = pieces[active];

  if (!piece) return null;

  const choose = (next: number) => { setPlaying(false); setActive((next + pieces.length) % pieces.length); };
  return (
    <div
      ref={region}
      className={styles.room}
      tabIndex={0}
      aria-roledescription="carrusel"
      aria-label="Sala de récords"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") choose(active - 1);
        if (event.key === "ArrowRight") choose(active + 1);
        if (event.key === "Home") choose(0);
        if (event.key === "End") choose(pieces.length - 1);
      }}
    >
      <article className={styles.roomPiece} key={piece.id}>
        <div className={styles.roomMedia}>
          {piece.surfaces ? (
            <div className={styles.surfaceStrip} aria-label="Récords por superficie">
              {piece.surfaces.map((surface) => (
                <div className={styles.surfacePanel} key={surface.label}>
                  <Image src={surface.image.src} alt={surface.image.alt} fill sizes="(max-width: 760px) 78vw, 28vw" style={{ objectPosition: surface.image.objectPosition || "center" }} />
                  <span><small>{surface.label}</small><strong>{surface.value}</strong><b>{surface.name}</b><em>{surface.sample}</em></span>
                </div>
              ))}
            </div>
          ) : piece.pairImages ? (
            <div className={styles.pairMedia}>
              {piece.pairImages.map((image) => <Image key={image.src} src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 50vw, 32vw" style={{ objectPosition: image.objectPosition || "50% 24%" }} />)}
            </div>
          ) : piece.image ? (
            <Image src={piece.image.src} alt={piece.image.alt} fill priority={active === 0} sizes="(max-width: 760px) 100vw, 62vw" style={{ objectPosition: piece.image.objectPosition || "center" }} />
          ) : null}
          {piece.video && !playing && (
            <button
              className={styles.playButton}
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Reproducir el partido de Isner y Mahut en Wimbledon 2010, 11 horas y 5 minutos"
            ><Play size={20} fill="currentColor" aria-hidden="true" /><span>Ver el partido.</span></button>
          )}
          {piece.video && playing && (
            <iframe
              className={styles.video}
              src="https://www.youtube.com/embed/jUgyaoew8as?autoplay=1&controls=1&rel=0&playsinline=1&cc_load_policy=1"
              title="Isner y Mahut en Wimbledon 2010"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        <div className={styles.roomCopy}>
          <p className={styles.roomIndex}>Pieza {String(active + 1).padStart(2, "0")}</p>
          <strong className={styles.roomMetric}>{piece.metric}</strong>
          <h3>{piece.title}</h3>
          <p>{piece.phrase}</p>
          <div className={styles.chips}>{piece.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
          <small className={styles.sample}>{piece.sample}</small>
          <div className={styles.roomLinks}>
            <Link href={piece.href}>Ver el dato</Link>
            {piece.matchHref && <Link href={piece.matchHref}>Ver el partido</Link>}
          </div>
        </div>
      </article>
      <div className={styles.roomNav}>
        <button type="button" onClick={() => choose(active - 1)} aria-label="Pieza anterior"><ChevronLeft aria-hidden="true" /></button>
        <div aria-label={`Pieza ${active + 1} de ${pieces.length}`}>
          {pieces.map((item, index) => <button key={item.id} type="button" onClick={() => choose(index)} aria-label={`Mostrar pieza ${index + 1}`} aria-current={index === active ? "true" : undefined} />)}
        </div>
        <button type="button" onClick={() => choose(active + 1)} aria-label="Pieza siguiente"><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}
