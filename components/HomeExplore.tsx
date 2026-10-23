import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { number } from "@/lib/cuaderno/model";
import { surfaceLabel } from "@/lib/surface";
import type { Match, Surface } from "@/lib/types";

const surfaces: Surface[] = ["hard", "clay", "grass", "carpet"];
const categories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250"];

export default function HomeExplore({ matches }: { matches: Match[] }) {
  const surfaceCounts = new Map<Surface, number>();
  const categoryCounts = new Map<string, number>();
  for (const match of matches) {
    surfaceCounts.set(match.surface, (surfaceCounts.get(match.surface) || 0) + 1);
    categoryCounts.set(match.category, (categoryCounts.get(match.category) || 0) + 1);
  }
  const items = [
    ...surfaces.map((surface) => ({
      key: surface,
      label: surfaceLabel[surface],
      detail: "Superficie",
      count: surfaceCounts.get(surface) || 0,
      href: `/buscar?surface=${surface}`,
      surface,
    })),
    ...categories.map((category) => ({
      key: category,
      label: category,
      detail: "Categoría",
      count: categoryCounts.get(category) || 0,
      href: `/buscar?category=${encodeURIComponent(category)}`,
      surface: undefined,
    })),
  ].filter((item) => item.count > 0);

  return (
    <section className="home-explore" aria-labelledby="home-explore-title">
      <div className="ds-section-heading">
        <div><span className="home-explore-kicker">Otra forma de entrar al archivo</span><h2 id="home-explore-title">Superficies y categorías</h2></div>
        <Link href="/buscar">Ver todos los filtros</Link>
      </div>
      <div className="home-explore-grid">
        {items.map((item) => (
          <Link href={item.href} key={item.key} data-event-surface={item.surface}>
            <span>{item.detail}</span>
            <strong>{item.label}</strong>
            <small>{number(item.count)} partidos</small>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
