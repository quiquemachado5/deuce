"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type { TournamentEditionMedia } from "@/lib/tournament-media";

export default function TournamentEditionMediaView({ media }: { media: TournamentEditionMedia }) {
  const [playing, setPlaying] = useState(false);
  return <section className="tournament-edition-media" aria-labelledby="edition-media-title">
    <div className="td-section-heading"><div><h2 id="edition-media-title">Registro multimedia</h2><p>Material de esta edición con procedencia y licencia visibles.</p></div><span>Edición {media.year}</span></div>
    <div className="edition-media-grid">
      <article className="edition-video">
        {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${media.video.youtubeId}?autoplay=1`} title={media.video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <button type="button" onClick={() => setPlaying(true)} aria-label={`Reproducir ${media.video.title}`}><Image src={`https://i.ytimg.com/vi/${media.video.youtubeId}/maxresdefault.jpg`} alt="" fill sizes="(max-width:759px) 100vw, 58vw" unoptimized /><span><Play size={21} fill="currentColor" /> Ver resumen oficial</span></button>}
        <div><strong>{media.video.title}</strong><p>Canal oficial verificado: {media.video.channel} · revisión {new Intl.DateTimeFormat("es-ES").format(new Date(`${media.video.verifiedAt}T12:00:00Z`))}</p><a href={media.video.source} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink size={14} /></a></div>
      </article>
      <figure className="edition-trophy">
        <div><Image src={media.trophy.src} alt={media.trophy.alt} fill sizes="(max-width:759px) 100vw, 34vw" style={{ objectPosition: media.trophy.objectPosition }} unoptimized /></div>
        <figcaption><strong>El trofeo de la edición</strong><span>{media.trophy.credit} · <a href={media.trophy.licenseUrl} target="_blank" rel="noreferrer">{media.trophy.license}</a></span><a href={media.trophy.source} target="_blank" rel="noreferrer">Original y metadatos <ExternalLink size={14} /></a></figcaption>
      </figure>
    </div>
  </section>;
}
