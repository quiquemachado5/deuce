"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EditorialPhoto from "@/components/EditorialPhoto";
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
  const visible = useRef(false),pauseUntil=useRef(0);
  const [position,setPosition]=useState({scrollable:false,start:true,end:false});
  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>(`.${styles.card}`);
    const gap = Number.parseFloat(getComputedStyle(node).gap || "0") || 0;
    const distance = (card?.getBoundingClientRect().width || Math.max(280, node.clientWidth * .72)) + gap;
    node.scrollBy({ left: distance * direction, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  useEffect(()=>{
    const node=viewport.current;if(!node)return;
    let frame=0;
    const update=()=>{frame=0;const max=node.scrollWidth-node.clientWidth;const next={scrollable:max>4,start:node.scrollLeft<3,end:node.scrollLeft>=max-3};setPosition(previous=>previous.scrollable===next.scrollable&&previous.start===next.start&&previous.end===next.end?previous:next);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    const resize=new ResizeObserver(schedule);resize.observe(node);
    const observer=new IntersectionObserver(entries=>{visible.current=entries.some(entry=>entry.isIntersecting);});observer.observe(node);
    node.addEventListener('scroll',schedule,{passive:true});schedule();
    return()=>{resize.disconnect();observer.disconnect();node.removeEventListener('scroll',schedule);if(frame)cancelAnimationFrame(frame);};
  },[cards.length]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  };
  useEffect(() => {
    if (variant === "majors" || cards.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const node = viewport.current;
      if (!node || !visible.current || paused.current || document.hidden || Date.now()<pauseUntil.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const card = node.querySelector<HTMLElement>(`.${styles.card}`);
      const gap = Number.parseFloat(getComputedStyle(node).gap || "0") || 0;
      const distance = (card?.getBoundingClientRect().width || Math.max(280, node.clientWidth * .72)) + gap;
      const atEnd = node.scrollLeft >= node.scrollWidth - node.clientWidth - 4;
      if (atEnd) node.scrollTo({ left: 0, behavior: "instant" });
      else node.scrollBy({ left: distance, behavior: "smooth" });
    }, autoplayDelay[label] || 4700);
    return () => window.clearInterval(timer);
  }, [cards.length, label, variant]);

  return <div className={`${styles.gallery} ${styles[variant]}`} onPointerEnter={event => { if(event.pointerType==='mouse')paused.current = true; }} onPointerLeave={() => { paused.current = false; }} onPointerDown={()=>{pauseUntil.current=Date.now()+9000;}} onFocusCapture={() => { paused.current = true; }} onBlurCapture={event => { if(!event.currentTarget.contains(event.relatedTarget))paused.current = false; }}>
    <div ref={viewport} className={styles.track} tabIndex={variant === "majors" ? -1 : 0} onKeyDown={onKeyDown} aria-label={label}>
      {cards.map((card, index) => {const women=/[?&]cuadro=wta(?:&|$)/.test(card.href);return <Link href={card.href} className={styles.card} key={card.id} prefetch={false} data-event-surface={card.surface}>
        <div className={styles.photo}>
          <EditorialPhoto
            className="art-directed-photo"
            src={card.image}
            alt={card.alt || card.title}
            label={card.title}
            priority={variant === "majors" && index === 0}
            sizes={variant === "majors" && index === 0 ? "(max-width:640px) 84vw, 52vw" : "(max-width:640px) 82vw, 31vw"}
            objectPosition={card.imagePosition || "center"}
            mobileObjectPosition={card.imagePositionMobile || card.imagePosition || "center"}
          />
          <span className={styles.photoShade} aria-hidden="true" />
          <span className={styles.court}>{card.court}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.titleRow}><h3>{card.title}</h3><span className={styles.action} aria-hidden="true"><ArrowRight size={18} /></span></div>
          <p className={styles.champion}>{card.champion ? <>{women?'Campeona':'Campeón'} {card.championYear}: <strong>{card.champion}</strong></> : card.court}</p>
        </div>
      </Link>})}
    </div>
    {position.scrollable&&<div className={styles.controls}><button type="button" disabled={position.start} onClick={()=>move(-1)} aria-label={`Anterior: ${label}`}><ChevronLeft size={18}/></button><button type="button" disabled={position.end} onClick={()=>move(1)} aria-label={`Siguiente: ${label}`}><ChevronRight size={18}/></button></div>}
  </div>;
}
