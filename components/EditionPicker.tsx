"use client";

import { useRouter } from "next/navigation";

export default function EditionPicker({
  slug,
  years,
  category,
  currentYear,
  categories = [],
}: {
  slug: string;
  years: number[];
  category?: string;
  currentYear?: number;
  categories?: Array<{ value: string; label: string; count?: number; years: number[] }>;
}) {
  const router = useRouter();
  const editionHref = (year: number, editionCategory = category) => `/torneos/${slug}/${year}${editionCategory ? `?categoria=${encodeURIComponent(editionCategory)}` : ""}`;
  const editions = [
      ...years.map((year) => ({ year, category })),
      ...categories.filter((option) => option.value !== category)
        .flatMap((option) => option.years.map((year) => ({ year, category: option.value }))),
    ].sort((a, b) => b.year - a.year)
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.year === entry.year) === index);
  const decades = [...new Set(editions.map(({ year }) => Math.floor(year / 10) * 10))];
  const selected = editions.find((entry) => entry.year === currentYear && (!category || entry.category === category))
    || editions.find((entry) => entry.year === currentYear);
  const value = currentYear && selected ? `${selected.year}::${selected.category || ""}` : "summary";

  return (
    <div className="nc-edition-picker">
      <label className="nc-field nc-edition-archive-select nc-edition-selector">
        <span>Edición del torneo</span>
        <select aria-label="Edición del torneo" value={value} onChange={(event) => {
          if (event.target.value === "summary") {
            router.push(`/torneos/${slug}`);
            return;
          }
          const [selectedYear, selectedCategory] = event.target.value.split("::");
          router.push(editionHref(Number(selectedYear), selectedCategory || undefined));
        }}>
          <option value="summary">Resumen</option>
          {decades.map((decade) => (
            <optgroup key={decade} label={`${decade}–${decade + 9}`}>
              {editions.filter(({ year }) => Math.floor(year / 10) * 10 === decade)
                .map((entry) => <option key={`${entry.year}-${entry.category || "current"}`} value={`${entry.year}::${entry.category || ""}`}>{entry.year}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}
