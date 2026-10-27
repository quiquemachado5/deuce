"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Shuffle } from "lucide-react";
import { imageFocus } from "@/lib/image-focus";

export type RecordDiscoveryFact = {
  id: string;
  name: string;
  value: string;
  statement: string;
  context: string;
  scope: string;
  href: string;
  proofHref?: string;
  surface?: string;
  photo: {
    src: string;
    alt: string;
    credit: string;
    source: string;
    licenseUrl?: string;
    photoYear?: number;
    objectPosition?: string;
    mobileObjectPosition?: string;
  };
};

/** The first fact is server rendered; randomness begins after hydration. */
export default function RecordDiscovery({
  facts,
}: {
  facts: RecordDiscoveryFact[];
}) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!facts.length) return;
    const frame = requestAnimationFrame(() =>
      setSelected(Math.floor(Math.random() * facts.length)),
    );
    return () => cancelAnimationFrame(frame);
  }, [facts.length]);

  if (!facts.length) return null;
  const fact = facts[selected];
  return (
    <section
      className="rd-discovery"
      data-record-surface={fact.surface}
      aria-label="Un descubrimiento del archivo"
    >
      <div className="rd-discovery-copy" data-discovery-id={fact.id}>
        <div
          className="rd-discovery-fact"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong className="rd-discovery-value">{fact.value}</strong>
          <h2>{fact.name}</h2>
          <p className="rd-discovery-definition">{fact.statement}</p>
          <p>{fact.context}</p>
        </div>
        <div className="rd-discovery-actions">
          <Link className="rd-discovery-primary" href={fact.href}>
            Explorar el dato <ArrowRight size={17} aria-hidden="true" />
          </Link>
          {fact.proofHref && <Link href={fact.proofHref}>Ver un partido</Link>}
        </div>
        <button
          type="button"
          className="rd-discovery-next"
          disabled={facts.length < 2}
          onClick={() =>
            setSelected(
              (current) =>
                (current + 1 + Math.floor(Math.random() * (facts.length - 1))) %
                facts.length,
            )
          }
        >
          <Shuffle size={17} aria-hidden="true" />
          Otro dato
        </button>
      </div>
      <figure className="rd-discovery-portrait" key={fact.photo.src}>
        <div className="rd-discovery-photo"><Image
          src={fact.photo.src}
          alt={fact.photo.alt}
          fill
          className="art-directed-photo"
          style={imageFocus(fact.photo.objectPosition||'center top',fact.photo.mobileObjectPosition||fact.photo.objectPosition||'center top')}
          sizes="(max-width: 759px) calc(100vw - 32px), (max-width: 1099px) 38vw, 440px"
        /></div>
        <figcaption>{fact.photo.credit} · <a href={fact.photo.source} target="_blank" rel="noreferrer">Fuente</a>{fact.photo.licenseUrl && <> · <a href={fact.photo.licenseUrl} target="_blank" rel="noreferrer">Licencia</a></>}</figcaption>
      </figure>
    </section>
  );
}
