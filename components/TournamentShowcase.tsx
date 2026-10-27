"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";

export type TournamentShowcaseCard = {
  id: string;
  title: string;
  href: string;
  image?: string | null;
  alt?: string;
  imagePosition?: string;
  surface: string;
  champion?: string | null;
  championYear?: number | null;
  editions: number;
  court: string;
};

export default function TournamentShowcase({ cards, variant = "rail", label }: {
  cards: TournamentShowcaseCard[];
  variant?: "majors" | "rail" | "compact";
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    const card=node.querySelector<HTMLElement>(".tournament-card");
    const gap=Number.parseFloat(getComputedStyle(node).gap||"0")||0;
    const distance = (card?.getBoundingClientRect().width || Math.max(280, node.clientWidth * .72)) + gap;
    node.scrollBy({ left: distance * direction, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  };
  return <div className={`tournament-showcase tournament-showcase--${variant}`}>
    {variant !== "majors" && cards.length > 2 && <div className="tournament-showcase-controls" aria-label={`Mover ${label}`}>
      <button type="button" onClick={() => move(-1)} aria-label={`Ver torneos anteriores de ${label}`}><ArrowLeft size={18} /></button>
      <button type="button" onClick={() => move(1)} aria-label={`Ver más torneos de ${label}`}><ArrowRight size={18} /></button>
    </div>}
    <div ref={viewport} className="tournament-showcase-track" tabIndex={variant === "majors" ? -1 : 0} onKeyDown={onKeyDown} aria-label={label}>
      {cards.map((card, index) => <Link href={card.href} className="catalog-card tournament-card" key={card.id} prefetch={false} data-event-surface={card.surface} data-index={index}>
        {card.image ? <Image src={card.image} alt={card.alt || card.title} fill priority={variant === "majors" && index === 0} sizes={variant === "majors" && index === 0 ? "(max-width:759px) 88vw, 52vw" : "(max-width:759px) 78vw, 28vw"} unoptimized={card.image.includes("/images/players/")} style={{ objectPosition: card.imagePosition || "center" }} /> : <span className="tournament-card-fallback" aria-hidden="true" />}
        <span className="tournament-card-shade" aria-hidden="true" />
        <span className="tournament-card-copy">
          <h2>{card.title}</h2>
          {card.champion ? <strong>Campeón {card.championYear}: {card.champion}</strong> : <strong>{card.court}</strong>}
          <small>{card.court} · {card.editions} {card.editions === 1 ? "edición" : "ediciones"}</small>
        </span>
        <ArrowRight className="tournament-card-arrow" size={19} aria-hidden="true" />
      </Link>)}
    </div>
  </div>;
}
