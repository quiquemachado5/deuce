"use client";

import { useEffect, useState } from "react";

export default function StatisticsFamilyNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id || "");

  useEffect(() => {
    const sections = items.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-112px 0px -68% 0px", threshold: [0, 0.1] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return <nav className="rv-family-nav" aria-label="Familias de estadísticas">
    {items.map(({ id, label }) => <a href={`#${id}`} key={id} aria-current={active === id ? "location" : undefined}>{label}</a>)}
  </nav>;
}
