import Link from "next/link";
import EditionPicker from "@/components/EditionPicker";

export default function TournamentEditionNav({
  slug,
  years,
  masters,
  category,
  currentYear,
}: {
  slug: string;
  years: number[];
  masters: boolean;
  category?: string;
  currentYear?: number;
}) {
  const query = category ? `?categoria=${encodeURIComponent(category)}` : "";
  return (
    <nav className="tournament-edition-nav" aria-label="Ediciones del torneo">
      <Link className="tournament-summary-link" href={`/torneos/${slug}${query}`} aria-current={currentYear ? undefined : "page"}>
        Resumen general
      </Link>
      <EditionPicker
        slug={slug}
        years={years}
        masters={masters}
        category={category}
        currentYear={currentYear}
      />
    </nav>
  );
}
