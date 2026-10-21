import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { notebook } from "@/lib/cuaderno/data";
import { searchArchive, matchingMatches } from "@/lib/cuaderno/search";
import { normalizeText } from "@/lib/quality";
import { round, description } from "@/lib/cuaderno/model";
import Row, { Pagination } from "@/components/nocturno/Row";
import FilterForm from "@/components/revista/FilterForm";
import { tournamentName } from "@/lib/labels";
import { tournamentDirectory, categoryLabel } from "@/lib/tournament-directory";
import styles from "./search.module.css";
type Q = Record<string, string | undefined>;

function searchUrl(q: Q, page?: number) {
  const params = new URLSearchParams(
    Object.entries(q).filter(
      ([key, value]) => key !== "page" && typeof value === "string" && value.length > 0,
    ) as [string, string][],
  );
  if (page && page > 1) params.set("page", String(page));
  return `/buscar${params.size ? `?${params}` : ""}`;
}
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Q>;
}) {
  const q = await searchParams;
  return {
    title: `${q.q ? `Buscar ${q.q}` : "Buscar en el archivo"} — DEUCE`,
    description,
    alternates: { canonical: searchUrl(q, Number(q.page) || 1) },
  };
}
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Q>;
}) {
  const q = await searchParams,
    data = await notebook(),
    tournaments = tournamentDirectory(data.matches),
    selectedTournament = tournaments.find((tournament) => tournament.slug === q.tournament),
    categories = ["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "Precursores de Masters", "ATP Tour · nivel no especificado"].filter((category) => data.matches.some((match) => match.category === category)),
    base = matchingMatches(q.q || q.player || "", data.matches),
    filtered = base
      .filter(
        (m) =>
          (!q.year || q.year === "all" || m.year === Number(q.year)) &&
          (!q.surface || q.surface === "all" || m.surface === q.surface) &&
          (!q.tournament || q.tournament === "all" || selectedTournament?.name === m.tournament) &&
          (!q.category || q.category === "all" || m.category === q.category) &&
          (!q.round ||
            q.round === "all" ||
            normalizeText(round(m)) === normalizeText(q.round)) &&
          (q.fiveSets !== "true" || m.score_summary.games.length === 5),
      )
      .sort((a, b) =>
        b.score_summary.timestamp.localeCompare(a.score_summary.timestamp),
      ),
    suggestions = q.q
      ? await searchArchive(q.q, { includeMatches: false })
      : [],
    total = filtered.length + suggestions.length,
    pages = Math.max(1, Math.ceil(total / 25)),
    page = Math.max(1, Math.min(pages, Number(q.page) || 1)),
    start = Math.max(0, (page - 1) * 25 - suggestions.length),
    end = page * 25 - suggestions.length,
    years = [...new Set(data.matches.map((m) => m.year))].sort((a, b) => b - a),
    activeFilters = [q.year, q.surface, q.tournament, q.category, q.round].filter(
      (value) => value && value !== "all",
    ).length + Number(q.fiveSets === "true"),
    hasSelection = Boolean(q.q || q.player || activeFilters > 0),
    suggestionsByGroup = ["Récords", "Jugadores", "Parejas"].map((group) => ({
      group,
      items: suggestions.filter((item) => item.group === group),
    }));
  return (
    <div className={`nc-wrap ${styles.searchPage}`}>
      <header className={styles.heading}>
        <h1>Busca en el archivo</h1>
      </header>

      <FilterForm action="/buscar">
        <div className={styles.searchBar}>
          <Search size={20} strokeWidth={1.8} aria-hidden="true" />
          <label className="nc-field nc-filter-query">
            <span className="nc-sr">Jugador, torneo, año o dato</span>
            <input
              name="q"
              type="search"
              defaultValue={q.q || q.player || ""}
              placeholder="Jugador, torneo o dato"
              autoComplete="off"
            />
          </label>
          <button type="submit" className={styles.searchButton}>Buscar</button>
        </div>

        <details className={styles.filters} open={activeFilters > 0}>
          <summary>
            <span className={styles.filterSummaryLabel}>
              <SlidersHorizontal size={17} strokeWidth={1.7} aria-hidden="true" />
              Filtrar
              {activeFilters > 0 && <span className={styles.filterCount}>{activeFilters} activos</span>}
            </span>
            <ChevronDown size={17} strokeWidth={1.7} aria-hidden="true" />
          </summary>
          <div className={styles.filterGrid}>
            <label className="nc-field">
              <span>Temporada</span>
              <select name="year" defaultValue={q.year || "all"}>
                <option value="all">Todas</option>
                {years.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
            <label className="nc-field">
              <span>Torneo</span>
              <select name="tournament" defaultValue={q.tournament || "all"}>
                <option value="all">Todos</option>
                {tournaments.map((tournament) => (
                  <option value={tournament.slug} key={tournament.slug}>
                    {tournamentName(tournament.name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="nc-field">
              <span>Categoría</span>
              <select name="category" defaultValue={q.category || "all"}>
                <option value="all">Todas</option>
                {categories.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}
              </select>
            </label>
            <label className="nc-field">
              <span>Superficie</span>
              <select name="surface" defaultValue={q.surface || "all"}>
                <option value="all">Todas</option>
                <option value="hard">Dura</option>
                <option value="clay">Tierra</option>
                <option value="grass">Hierba</option>
              </select>
            </label>
            <label className="nc-field">
              <span>Ronda</span>
              <select name="round" defaultValue={q.round || "all"}>
                <option value="all">Todas</option>
                {["Primera", "Segunda", "Tercera", "Octavos", "Cuartos", "Semifinal", "Final"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className={styles.fiveSets}>
              <input type="checkbox" name="fiveSets" value="true" defaultChecked={q.fiveSets === "true"} />
              Solo partidos a cinco sets
            </label>
          </div>
        </details>
      </FilterForm>

      {hasSelection && (
        <div className={styles.selection}>
          <span>{total.toLocaleString("es-ES")} resultados</span>
          <Link href="/buscar">Limpiar búsqueda</Link>
        </div>
      )}

      {page === 1 && suggestions.length > 0 && (
        <section className={styles.suggestions} aria-labelledby="search-suggestions-heading">
          <h2 id="search-suggestions-heading">Otros resultados</h2>
          <div className={styles.suggestionGroups}>
            {suggestionsByGroup.filter(({ items }) => items.length > 0).map(({ group, items }) => (
              <div key={group} className={styles.suggestionGroup}>
                <h3>{group}</h3>
                {items.map((item) => (
                  <Link className="nc-index-row" key={item.href} href={item.href}>
                    <span>{item.name}</span>
                    <small>{item.detail || item.group}</small>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {(filtered.length > 0 || suggestions.length === 0) && (
        <section className={styles.matches} aria-labelledby="search-matches-heading">
          <div className={styles.resultsHead}>
            <h2 id="search-matches-heading">{hasSelection ? "Partidos" : "Últimos partidos"}</h2>
            <span>{filtered.length.toLocaleString("es-ES")} partidos</span>
          </div>
          {filtered.slice(start, end).map((match) => <Row key={match.match_id} match={match} />)}
          {!filtered.length && (
            <div className={styles.empty}>
              <p>{q.q || q.player ? "Ningún partido coincide con la búsqueda y los filtros." : "No hay partidos con estos filtros."}</p>
              <Link href="/buscar">Limpiar búsqueda</Link>
            </div>
          )}
          {total > 25 && (
            <Pagination page={page} total={total} href={(nextPage) => searchUrl(q, nextPage)} />
          )}
        </section>
      )}
    </div>
  );
}
