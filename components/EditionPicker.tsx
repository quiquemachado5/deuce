"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditionPicker({
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
  const archived = years.slice(4);
  const mobileArchived = years.slice(2);
  const router = useRouter();
  const editionHref = (year: number) => `/torneos/${slug}/${year}${category ? `?categoria=${encodeURIComponent(category)}` : ""}`;
  const categoryHref = (nextCategory: string) => {
    const option = categories.find((item) => item.value === nextCategory);
    const base = currentYear && option?.years.includes(currentYear)
      ? `/torneos/${slug}/${currentYear}`
      : `/torneos/${slug}`;
    return `${base}?categoria=${encodeURIComponent(nextCategory)}`;
  };
  const archiveSelect = (availableYears: number[], className: string) => {
    const decades = [...new Set(availableYears.map((year) => Math.floor(year / 10) * 10))];
    return availableYears.length > 0 && (
      <label className={`nc-field nc-edition-archive-select ${className}`}>
        <span>Archivo de ediciones</span>
        <select aria-label="Archivo de ediciones" value={currentYear && availableYears.includes(currentYear) ? currentYear : ""} onChange={(event) => {
          if (event.target.value) router.push(editionHref(Number(event.target.value)));
        }}>
          <option value="">Más años</option>
          {decades.map((decade) => (
            <optgroup key={decade} label={`${decade}–${decade + 9}${masters && decade < 1990 ? " · precursores" : ""}`}>
              {availableYears.filter((year) => Math.floor(year / 10) * 10 === decade)
                .map((year) => <option key={year} value={year}>{year}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    );
  };
  return (
    <div className="nc-edition-picker">
      {categories.length > 1 && (
        <label className="nc-edition-category-select">
          <span>Etapa del torneo</span>
          <select
            aria-label="Etapa del torneo"
            value={category || categories[0]?.value || ""}
            onChange={(event) => router.push(categoryHref(event.target.value))}
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{option.count === undefined ? "" : ` · ${option.count}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <nav className="nc-edition-recent" aria-label="Últimas ediciones">
        {years.slice(0, 4).map((year) => (
          <Link key={year} href={editionHref(year)} aria-current={currentYear === year ? "page" : undefined}>
            {year}
          </Link>
        ))}
      </nav>
      {archiveSelect(archived, "nc-edition-archive-select--desktop")}
      {archiveSelect(mobileArchived, "nc-edition-archive-select--mobile")}
    </div>
  );
}
