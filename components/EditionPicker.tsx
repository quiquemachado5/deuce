"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditionPicker({
  slug,
  years,
  masters,
  category,
}: {
  slug: string;
  years: number[];
  masters: boolean;
  category?: string;
}) {
  const archived = years.slice(4);
  const router = useRouter();
  const decades = [...new Set(archived.map((year) => Math.floor(year / 10) * 10))];
  const editionHref = (year: number) => `/${slug}/${year}${category ? `?categoria=${encodeURIComponent(category)}` : ""}`;
  return (
    <div className="nc-edition-picker">
      <nav className="nc-edition-recent" aria-label="Últimas ediciones">
        {years.slice(0, 4).map((year) => (
          <Link key={year} href={editionHref(year)}>
            {year}
          </Link>
        ))}
      </nav>
      {archived.length > 0 && (
        <label className="nc-field nc-edition-archive-select">
          <span>Archivo de ediciones</span>
          <select value="" onChange={(event) => {
            if (event.target.value) router.push(editionHref(Number(event.target.value)));
          }}>
            <option value="">Elegir otro año</option>
            {decades.map((decade) => (
              <optgroup key={decade} label={`${decade}–${decade + 9}${masters && decade < 1990 ? " · precursores" : ""}`}>
                {archived.filter((year) => Math.floor(year / 10) * 10 === decade)
                  .map((year) => <option key={year} value={year}>{year}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
