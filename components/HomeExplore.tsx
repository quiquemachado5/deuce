import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import PhotoInfo from "@/components/PhotoInfo";
import { courtPhotos } from "@/lib/imagery";
import { number } from "@/lib/cuaderno/model";
import { surfaceLabel } from "@/lib/surface";
import { verifiedTournamentCategory } from "@/lib/tournament-tier";
import type { Match, Surface } from "@/lib/types";

const surfaces: Surface[] = ["hard", "clay", "grass", "carpet"];
const categories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250"];
const surfacePhotos: Partial<Record<Surface, (typeof courtPhotos)[string]>> = { hard: courtPhotos['US Open'], clay: courtPhotos['Roland Garros'], grass: courtPhotos.Wimbledon };

export default function HomeExplore({ matches }: { matches: Match[] }) {
  const surfaceCounts = new Map<Surface, number>();
  const categoryCounts = new Map<string, number>();
  for (const match of matches) {
    surfaceCounts.set(match.surface, (surfaceCounts.get(match.surface) || 0) + 1);
    const category = verifiedTournamentCategory(match.category, match.tournament, match.year);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }
  const items = [
    ...surfaces.map((surface) => ({
      key: surface,
      label: surfaceLabel[surface],
      detail: "Superficie",
      count: surfaceCounts.get(surface) || 0,
      href: `/buscar?surface=${surface}`,
      surface,
      photo: surfacePhotos[surface],
    })),
    ...categories.map((category) => ({
      key: category,
      label: category,
      detail: "Categoría",
      count: categoryCounts.get(category) || 0,
      href: `/buscar?category=${encodeURIComponent(category)}`,
      surface: undefined,
      photo: undefined,
    })),
  ].filter((item) => item.count > 0);

  return (
    <section className="home-explore" aria-labelledby="home-explore-title">
      <div className="ds-section-heading">
        <h2 id="home-explore-title">Superficies y categorías</h2>
        <Link href="/buscar">Ver todos los filtros</Link>
      </div>
      <div className="home-explore-grid">
        {items.map((item) => (
          <div className={`home-explore-card${item.photo ? " home-explore-card-photo" : ""}`} key={item.key} data-event-surface={item.surface}>
            {item.photo && <Image className="home-explore-image" src={item.photo.src} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 25vw" />}
            <Link href={item.href} aria-label={`Explorar ${item.label}: ${number(item.count)} partidos`}>
              <span>{item.detail}</span>
              <strong>{item.label}</strong>
              <small>{number(item.count)} partidos</small>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            {item.photo && <PhotoInfo photo={item.photo} />}
          </div>
        ))}
      </div>
    </section>
  );
}
