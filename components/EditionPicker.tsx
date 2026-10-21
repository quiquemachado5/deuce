"use client";

import { useState } from "react";
import Link from "next/link";

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
  const decades = [
    ...new Set(archived.map((year) => Math.floor(year / 10) * 10)),
  ];
  const [decade, setDecade] = useState(decades[0] || 2020);
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
        <details className="nc-edition-archive">
          <summary>Ediciones anteriores</summary>
          <div>
            <label className="nc-field">
              <span>Década</span>
              <select
                value={decade}
                onChange={(event) => setDecade(Number(event.target.value))}
              >
                {decades.map((value) => (
                  <option key={value} value={value}>
                    {value}–{value + 9}
                  </option>
                ))}
              </select>
            </label>
            <nav
              className="nc-edition-years"
              aria-label="Ediciones de la década"
            >
              {archived
                .filter((year) => Math.floor(year / 10) * 10 === decade)
                .map((year) => (
                  <Link key={year} href={editionHref(year)}>
                    {year}
                  </Link>
                ))}
            </nav>
            {masters && decade < 1990 && (
              <p className="nc-meta">Precursores de los Masters.</p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
