import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { TournamentSlide } from '@/types/deuce';
export function TournamentSlider({ slides }: { slides:TournamentSlide[] }) {
  if(!slides.length)return null;
  return <section className="tournament-band tournament-static" aria-labelledby="grand-venues-title">
    <div className="section-head light"><h2 id="grand-venues-title">Grandes escenarios</h2><Link className="deuce-cta" href="/torneos?categoria=Grand%20Slam">Explorar torneos <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    <div className="tournament-static-grid">{slides.map(slide=><article className="archive-slide active" key={slide.id}>
      <Image src={slide.image} alt={slide.alt} fill sizes="(max-width:759px) 86vw, 24vw"/><div className="slide-copy"><h3><Link href={slide.href}>{slide.name}</Link></h3><p>{slide.description}</p></div>
    </article>)}</div>
  </section>;
}
