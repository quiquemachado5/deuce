"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { imageFocus } from "@/lib/image-focus";
import styles from "./TournamentGallery.module.css";

export type TournamentGalleryCard = {
  id: string;
  title: string;
  href: string;
  image?: string | null;
  alt?: string;
  imagePosition?: string;
  imagePositionMobile?: string;
  surface: string;
  champion?: string | null;
  championYear?: number | null;
  court: string;
};

type GalleryVariant = "majors" | "rail" | "compact";

const autoplayDelay: Record<string, number> = {
  "Masters 1000": 4300,
  "ATP 500": 5100,
  "ATP 250": 5900,
};

export default function TournamentGallery({ cards, variant = "rail", label }: {
  cards: TournamentGalleryCard[];
  variant?: GalleryVariant;
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>(`.${styles.card}`);
    const gap = Number.parseFloat(getComputedStyle(node).gap || "0") || 0;
    const distance = (card?.getBoundingClientRect().width || Math.max(280, node.clientWidth * .72)) + gap;
    node.scrollBy({ left: distance * direction, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  };
  useEffect(() => {
    if (variant === "majors" || cards.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const node = viewport.current;
      if (!node || paused.current || document.hidden) return;
      const card = node.querySelector<HTMLElement>(`.${styles.card}`);
      const gap = Number.parseFloat(getComputedStyle(node).gap || "0") || 0;
      const distance = (card?.getBoundingClientRect().width || Math.max(280, node.clientWidth * .72)) + gap;
      const atEnd = node.scrollLeft >= node.scrollWidth - node.clientWidth - 4;
      if (atEnd) node.scrollTo({ left: 0, behavior: "smooth" });
      else node.scrollBy({ left: distance, behavior: "smooth" });
    }, autoplayDelay[label] || 4700);
    return () => window.clearInterval(timer);
  }, [cards.length, label, variant]);

  return <div className={`${styles.gallery} ${styles[variant]}`} onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }} onFocusCapture={() => { paused.current = true; }} onBlurCapture={() => { paused.current = false; }}>
    <div ref={viewport} className={styles.track} tabIndex={variant === "majors" ? -1 : 0} onKeyDown={onKeyDown} aria-label={label}>
      {cards.map((card, index) => <Link href={card.href} className={styles.card} key={card.id} prefetch={false} data-event-surface={card.surface}>
        <div className={styles.photo}>
          {card.image ? <Image className="art-directed-photo" src={card.image} alt={card.alt || card.title} fill priority={variant === "majors" && index === 0} sizes={variant === "majors" && index === 0 ? "(max-width:640px) 84vw, 52vw" : "(max-width:640px) 82vw, 31vw"} unoptimized={card.image.includes("/images/players/")} style={imageFocus(card.imagePosition || "center", card.imagePositionMobile || card.imagePosition || "center")} /> : <span className={styles.fallback} aria-hidden="true" />}
          <span className={styles.photoShade} aria-hidden="true" />
          <span className={styles.court}>{card.court}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.titleRow}><h3>{card.title}</h3><span className={styles.action} aria-hidden="true"><ArrowRight size={18} /></span></div>
          <p className={styles.champion}>{card.champion ? <>Campeón {card.championYear}: <strong>{card.champion}</strong></> : card.court}</p>
        </div>
      </Link>)}
    </div>
  </div>;
}
