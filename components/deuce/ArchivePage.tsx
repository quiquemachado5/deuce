import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ArchiveCard } from '@/types/deuce';
import { imageFocus } from '@/lib/image-focus';
export function ArchiveGrid({ cards }: { cards:ArchiveCard[] }) {
  return <div className="catalog-grid">{cards.map((card,index)=><Link href={card.href} className="catalog-card hover-card" key={card.id} prefetch={false} data-event-surface={card.surface}>
    {card.image&&<Image className="art-directed-photo" unoptimized={card.image.startsWith("/")} src={card.image} alt={card.alt||card.title} width={640} height={450} loading={index<4?'eager':'lazy'} sizes="(max-width:600px) 120px, (max-width:900px) 44vw, 29vw" style={imageFocus(card.imagePosition||'center top',card.imagePositionMobile||card.imagePosition||'center top')}/>}
    {!card.image&&card.fallback&&<span className="catalog-card-fallback-identity" aria-hidden="true">{card.fallback}</span>}
    <div className="catalog-copy">{card.value&&<strong className="record-number">{card.value}</strong>}{card.eyebrow&&<span>{card.eyebrow}</span>}<h2>{card.title}</h2>{card.meta&&<p>{card.meta}</p>}{card.actionLabel&&<span className="catalog-card-action">{card.actionLabel}<ArrowUpRight size={16} aria-hidden="true"/></span>}</div>
  </Link>)}</div>;
}
export function ArchivePage({ title, children, className = '', tools }: { title:string;children:ReactNode;className?:string;tools?:ReactNode }) {
  return <div className={`view-root${className ? ` ${className}` : ''}`}><header className="inner-title"><h1>{title}</h1>{tools&&<div className="inner-title-tools">{tools}</div>}</header>{children}</div>;
}
