'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';

export type PlayerDiscoveryItem = {
  id: string;
  title: string;
  value: string;
  unit: string;
  detail: string;
  sample: string;
  href: string;
  linkLabel: string;
  surface?: string;
};

export default function PlayerDiscovery({ items }: { items: PlayerDiscoveryItem[] }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const frame = requestAnimationFrame(() => setSelected(Math.floor(Math.random() * items.length)));
    return () => cancelAnimationFrame(frame);
  }, [items.length]);
  if (!items.length) return null;
  const current = items[selected];
  return (
    <section className="pd-discovery" aria-labelledby="pd-discovery-title" data-event-surface={current.surface} data-discovery-id={current.id}>
      <div className="pd-discovery-heading">
        <h2 id="pd-discovery-title">Una trayectoria, otro dato.</h2>
        {items.length > 1 && (
          <button type="button" onClick={() => setSelected(index => (index + 1 + Math.floor(Math.random() * (items.length - 1))) % items.length)}>
            Otro dato <RotateCw size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="nc-sr" role="status" aria-live="polite" aria-atomic="true">{current.title}: {current.value} {current.unit}. {current.detail} {current.sample}</p>
      <div className="pd-discovery-stack">
        {items.map((item, index) => (
          <div className="pd-discovery-body" key={item.id} data-current={index === selected ? 'true' : undefined} aria-hidden={index !== selected}>
            <p className="pd-discovery-value" data-stat={item.id}><strong>{item.value}</strong>{item.unit && <span>{item.unit}</span>}</p>
            <div className="pd-discovery-text">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <p className="pd-discovery-sample">{item.sample}</p>
              <Link href={item.href} tabIndex={index === selected ? undefined : -1}>{item.linkLabel}</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
