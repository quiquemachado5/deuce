import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { TournamentSlide } from '@/types/deuce';
import { imageFocus } from '@/lib/image-focus';
export function TournamentSlider({ slides }: { slides:TournamentSlide[] }) {
  if(!slides.length)return null;
  return <section className="tournament-band tournament-static" aria-labelledby="grand-venues-title">
    <div className="section-head light"><h2 id="grand-venues-title">Grandes escenarios</h2><Link className="deuce-cta" href="/torneos">Ver torneos <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    <div className="tournament-static-grid" role="list" aria-label="Grand Slams y Masters 1000">{slides.map((slide,index)=><article className="archive-slide active" role="listitem" key={slide.id}>
      <Image className="art-directed-photo" src={slide.image} alt={slide.alt} fill sizes="(max-width:759px) 84vw, 31vw" priority={index<2} style={imageFocus(slide.imagePosition||'center',slide.imagePositionMobile||slide.imagePosition||'center')}/><div className="slide-copy"><h3><Link href={slide.href}>{slide.name}</Link></h3></div>
    </article>)}</div>
  </section>;
}
