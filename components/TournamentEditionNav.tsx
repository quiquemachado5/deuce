import Link from "next/link";
import EditionPicker from "@/components/EditionPicker";

export default function TournamentEditionNav({
  slug,
  years,
  masters,
  category,
  currentYear,
  categories = [],
}: {
  slug: string;
  years: number[];
  masters: boolean;
  category?: string;
  currentYear?: number;
  categories?: Array<{ value: string; label: string; count?: number; years: number[] }>;
}) {
  const query = category ? `?categoria=${encodeURIComponent(category)}` : "";
  return (
    <nav className="tournament-edition-nav" aria-label="Ediciones del torneo">
      <Link className="tournament-summary-link" href={`/torneos/${slug}${query}`} aria-current={currentYear ? undefined : "page"}>
        <span className="tournament-summary-full">Resumen general</span>
        <span className="tournament-summary-short">Resumen</span>
      </Link>
      <EditionPicker
        slug={slug}
        years={years}
        masters={masters}
        category={category}
        currentYear={currentYear}
        categories={categories}
      />
    </nav>
  );
}
