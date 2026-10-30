import EditionPicker from "@/components/EditionPicker";

export default function TournamentEditionNav({
  slug,
  years,
  category,
  currentYear,
  categories = [],
  tour,
}: {
  slug: string;
  years: number[];
  category?: string;
  currentYear?: number;
  categories?: Array<{ value: string; label: string; count?: number; years: number[] }>;
  tour?: 'atp' | 'wta';
}) {
  return (
    <nav className="tournament-edition-nav" aria-label="Ediciones del torneo">
      <EditionPicker
        slug={slug}
        years={years}
        category={category}
        currentYear={currentYear}
        categories={categories}
        tour={tour}
      />
    </nav>
  );
}
