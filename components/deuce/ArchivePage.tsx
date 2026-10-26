import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ArchiveCard } from '@/types/deuce';
export function ArchiveGrid({ cards }: { cards:ArchiveCard[] }) {
  return <div className="catalog-grid">{cards.map(card=><Link href={card.href} className="catalog-card hover-card" key={card.id} prefetch={false} data-event-surface={card.surface}>
    {card.image&&<Image unoptimized={card.image.startsWith("/images/players/")} src={card.image} alt={card.alt||card.title} width={640} height={450} sizes="(max-width:600px) 120px, (max-width:900px) 44vw, 29vw" style={{objectPosition:card.imagePosition||'center top'}}/>}
    <div className="catalog-copy">{card.value&&<strong className="record-number">{card.value}</strong>}{card.eyebrow&&<span>{card.eyebrow}</span>}<h2>{card.title}</h2>{card.meta&&<p>{card.meta}</p>}</div>
  </Link>)}</div>;
}
export function ArchivePage({ title, children, className = '' }: { title:string;children:ReactNode;className?:string }) {
  return <div className={`view-root${className ? ` ${className}` : ''}`}><header className="inner-title"><h1>{title}</h1></header>{children}</div>;
}
