"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";

export type SearchItem = {
  href: string;
  name: string;
  detail?: string;
  group: string;
};

const searchGroups = [
  "Jugadores",
  "Torneos",
  "Ediciones",
  "Parejas",
  "Récords",
  "Partidos",
];

export function SearchResults({
  query,
  choose,
  first,
  clear,
}: {
  query: string;
  choose?: () => void;
  first?: string;
  clear?: () => void;
}) {
  const [result, setResult] = useState<{
    query: string;
    items: SearchItem[];
    failed?: boolean;
  }>({ query: "", items: [] });
  const [attempt, setAttempt] = useState(0);
  const searchQuery = query.trim();
  const loading = Boolean(searchQuery && result.query !== searchQuery);
  const items =
    result.query === searchQuery
      ? result.items
          .filter((item) => !first || item.group === "Partidos")
          .slice(0, 25)
      : [];
  const failed = !loading && result.query === searchQuery && result.failed;

  useEffect(() => {
    if (!searchQuery) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
          { signal: abort.signal },
        );
        if (!response.ok) throw new Error("search");
        const data = await response.json();
        setResult({
          query: searchQuery,
          items: Array.isArray(data.items) ? data.items : [],
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setResult({ query: searchQuery, items: [], failed: true });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [searchQuery, attempt]);

  if (!searchQuery) return null;
  return (
    <div className="ry-search-results" aria-busy={loading}>
      {loading && (
        <p className="ry-search-status" role="status">
          Buscando…
        </p>
      )}
      {failed && (
        <p className="ry-search-status" role="status">
          No se pudo cargar la búsqueda.{" "}
          <button
            type="button"
            className="ry-text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </p>
      )}
      {!loading && !failed && !items.length && (
        <p className="ry-search-status" role="status">
          No hay resultados para «{searchQuery}».{" "}
          {clear ? (
            <button type="button" className="ry-text-button" onClick={clear}>
              Limpiar búsqueda
            </button>
          ) : (
            <Link href="/buscar">Buscar con filtros</Link>
          )}
        </p>
      )}
      {searchGroups.map((group) => {
        const rows = items.filter((item) => item.group === group);
        return rows.length ? (
          <section className="ry-search-group" key={group}>
            <h3>{group === "Parejas" ? "Rivalidades" : group}</h3>
            {rows.map((row) => (
              <Link
                className="ry-search-row"
                href={
                  first
                    ? `/match/${first}?junto=${encodeURIComponent(row.href.split("/").pop() || "")}#comparar`
                    : row.href
                }
                key={row.href}
                onClick={choose}
              >
                <span>
                  <strong>{row.name}</strong>
                  {row.detail && <small>{row.detail}</small>}
                </span>
              </Link>
            ))}
          </section>
        ) : null;
      })}
    </div>
  );
}

const destinations = [
  { label: "Partidos", href: "/buscar" },
  { label: "Estadísticas", href: "/records" },
  { label: "Jugadores", href: "/jugadores" },
  { label: "Torneos", href: "/tournaments" },
  { label: "Comparar", href: "/comparar" },
] as const;

function pageLabel(path: string) {
  if (path === "/comparar" || path === "/compare") return "Comparar";
  if (path.startsWith("/records")) return "Estadísticas";
  if (path.startsWith("/rivalries")) return "Jugadores";
  if (path.startsWith("/players") || path === "/jugadores") return "Jugadores";
  if (
    path.startsWith("/torneo") ||
    path === "/tournaments" ||
    /^\/[^/]+\/\d{4}$/.test(path)
  )
    return "Torneos";
  if (path.startsWith("/match") || path === "/buscar" || path === "/partidos")
    return "Partidos";
  if (path === "/info") return "Cómo se lee";
  if (path === "/credits") return "Fotografías";
  return "";
}

function Navigation({
  active,
  mode,
  choose,
}: {
  active: string;
  mode: "desktop" | "menu";
  choose?: () => void;
}) {
  return (
    <nav
      className={`ry-navigation ry-navigation--${mode}`}
      aria-label={
        mode === "menu" ? "Menú de navegación" : "Navegación principal"
      }
    >
      {destinations.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          onClick={choose}
          aria-current={active === label ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function ContextNavigation(
  props: Omit<Parameters<typeof Navigation>[0], "active"> & {
    fallback: string;
  },
) {
  const parameters = useSearchParams();
  const path = usePathname();
  const active =
    path === "/jugadores" && parameters.get("tipo") === "parejas"
      ? "Jugadores"
      : props.fallback;
  return <Navigation active={active} mode={props.mode} choose={props.choose} />;
}

function NavSection({
  active,
  mode,
  choose,
}: Parameters<typeof Navigation>[0]) {
  return (
    <Suspense
      fallback={<Navigation active={active} mode={mode} choose={choose} />}
    >
      <ContextNavigation fallback={active} mode={mode} choose={choose} />
    </Suspense>
  );
}

function Wordmark({ choose }: { choose?: () => void }) {
  return (
    <Link
      className="ry-wordmark"
      href="/"
      aria-label="DEUCE, inicio"
      onClick={choose}
    >
      <span>DEUCE</span>
    </Link>
  );
}

type Theme = "system" | "dark" | "light";
const themeKey = "deuce-rally-theme";
function storedTheme(): Theme {
  try {
    const value = localStorage.getItem(themeKey);
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
}

export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = pageLabel(path);
  const menu = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLDialogElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef("");
  const initialPath = useRef(path);
  const themePicker = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>("system");
  const [activeDialog, setActiveDialog] = useState<"menu" | "search" | null>(
    null,
  );

  useEffect(() => {
    const preference = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(storedTheme());
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Route changes dismiss overlays; the first hydration must not close one
    // that a visitor opened before this effect ran.
    if (initialPath.current === path) return;
    initialPath.current = path;
    if (menu.current?.open) menu.current.close();
    if (search.current?.open) search.current.close();
  }, [path]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
        return;
      if (menu.current?.open) return;
      event.preventDefault();
      const target = search.current;
      if (!target || target.open) {
        searchField.current?.focus();
        return;
      }
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      target.showModal();
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      setActiveDialog("search");
      searchField.current?.focus();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const close = () => {
    if (menu.current?.open) menu.current.close();
    if (search.current?.open) search.current.close();
    setActiveDialog(null);
  };
  const restoreFocus = () => {
    document.body.style.overflow = previousOverflow.current;
    setActiveDialog(null);
    if (opener.current?.isConnected) opener.current.focus();
  };
  const open = (dialog: "menu" | "search", trigger: HTMLElement) => {
    const target = dialog === "menu" ? menu.current : search.current;
    if (!target || target.open) return;
    opener.current = trigger;
    target.showModal();
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveDialog(dialog);
    if (dialog === "search") searchField.current?.focus();
  };
  const dismissBackdrop = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      close();
  };
  const trapFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  const selectTheme = (value: Theme) => {
    setTheme(value);
    try {
      localStorage.setItem(themeKey, value);
    } catch {}
    applyTheme(value);
    if (themePicker.current) {
      themePicker.current.open = false;
      themePicker.current.querySelector("summary")?.focus();
    }
  };
  return (
    <>
      <a className="ry-skip" href="#main-content">
        Saltar al contenido
      </a>
      <div className="ry-workspace">
        <header className="ry-header">
          <div className="ry-header-main">
            <div className="ry-header-brand">
              <Wordmark />
            </div>
            <NavSection active={active} mode="desktop" />
            <div className="ry-header-actions">
              <button
                className="ry-search-trigger"
                aria-label="Buscar en DEUCE"
                aria-haspopup="dialog"
                aria-controls="ry-search-dialog"
                aria-expanded={activeDialog === "search"}
                aria-keyshortcuts="Control+K Meta+K"
                type="button"
                onClick={(event) => open("search", event.currentTarget)}
              >
                <Search size={16} strokeWidth={1.6} aria-hidden="true" />
                <span>Jugador, torneo o dato</span>
              </button>
              <button
                className="ry-icon-button ry-menu-trigger"
                type="button"
                aria-label="Abrir menú"
                aria-haspopup="dialog"
                aria-controls="ry-menu-dialog"
                aria-expanded={activeDialog === "menu"}
                onClick={(event) => open("menu", event.currentTarget)}
              >
                <Menu size={21} aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>
        <main className="ry-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="ry-footer">
          <div className="deuce-footer-panel">
            <Link
              href="/"
              className="deuce-footer-brand"
              aria-label="DEUCE, volver al inicio"
            >
              DEUCE
            </Link>
            <nav className="deuce-footer-courts" aria-label="Pistas">
              {[
                ["grass", "Hierba", "wimbledon"],
                ["clay", "Tierra", "roland-garros"],
                ["hard", "Dura", "us-open"],
              ].map(([surface, label, image]) => (
                <Link
                  key={surface}
                  href={`/buscar?surface=${surface}`}
                  data-event-surface={surface}
                >
                  <Image
                    src={`/images/courts/${image}.jpg`}
                    width={160}
                    height={96}
                    sizes="80px"
                    alt=""
                  />
                  <span>
                    <i
                      className={`nc-dot nc-dot-${surface}`}
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="ry-footer-inner">
            <nav aria-label="Información">
              <Link href="/info">Cómo se lee</Link>
              <Link href="/cobertura">Cobertura</Link>
              <Link href="/credits">Fotografías</Link>
            </nav>
            <details className="ry-theme" ref={themePicker}>
              <summary
                onClick={() => setTheme(storedTheme())}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    if (themePicker.current) themePicker.current.open = false;
                    event.currentTarget.focus();
                  }
                }}
              >
                Tema
              </summary>
              <div
                className="ry-theme-options"
                role="group"
                aria-label="Tema de la interfaz"
              >
                {(
                  [
                    ["system", "Sistema"],
                    ["dark", "Oscuro"],
                    ["light", "Claro"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={theme === value}
                    onClick={() => selectTheme(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
            <span className="ry-copyright">
              © {new Date().getFullYear()} DEUCE
            </span>
          </div>
        </footer>
      </div>
      <dialog
        id="ry-menu-dialog"
        className="ry-menu-dialog"
        aria-label="Navegación"
        ref={menu}
        onClose={restoreFocus}
        onClick={dismissBackdrop}
        onKeyDown={trapFocus}
      >
        <div className="ry-dialog-header">
          <Wordmark choose={close} />
          <button
            className="ry-icon-button"
            type="button"
            aria-label="Cerrar menú"
            onClick={close}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <NavSection active={active} mode="menu" choose={close} />
      </dialog>
      <dialog
        id="ry-search-dialog"
        className="ry-search-dialog"
        aria-labelledby="ry-search-title"
        ref={search}
        onClose={restoreFocus}
        onClick={dismissBackdrop}
        onKeyDown={trapFocus}
      >
        <div className="ry-dialog-header">
          <h2 id="ry-search-title">Buscar</h2>
          <button
            className="ry-icon-button"
            type="button"
            aria-label="Cerrar búsqueda"
            onClick={close}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form action="/buscar" onSubmit={close} className="ry-dialog-search">
          <Search size={20} aria-hidden="true" />
          <label className="ry-sr" htmlFor="ry-search-query">
            Jugador, torneo o dato
          </label>
          <input
            id="ry-search-query"
            type="search"
            ref={searchField}
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
            placeholder="Jugador, torneo o dato"
            autoComplete="off"
          />
        </form>
        {query.trim() ? (
          <SearchResults
            query={query}
            choose={close}
            clear={() => {
              setQuery("");
              searchField.current?.focus();
            }}
          />
        ) : (
          <div className="ry-search-suggestions">
            <div>
              <Link href="/buscar?q=Alcaraz" onClick={close}>
                Alcaraz
              </Link>
              <Link href="/buscar?q=Wimbledon" onClick={close}>
                Wimbledon
              </Link>
              <Link href="/records?dato=remontada-dos-sets" onClick={close}>
                Remontadas
              </Link>
            </div>
          </div>
        )}
        <Link
          className="ry-search-all"
          href={`/buscar?q=${encodeURIComponent(query)}`}
          onClick={close}
        >
          {query.trim() ? "Ver todos los resultados" : "Buscar con filtros"}
        </Link>
      </dialog>
    </>
  );
}
