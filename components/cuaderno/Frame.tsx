"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Menu, X } from "lucide-react";
export type SearchItem = {
  href: string;
  name: string;
  detail?: string;
  group: string;
};
export function SearchResults({
  query,
  choose,
  first,
}: {
  query: string;
  choose?: () => void;
  first?: string;
}) {
  const [response, setResponse] = useState<{
      query: string;
      items: SearchItem[];
      error?: string;
    }>({ query: "", items: [] }),
    [retry, setRetry] = useState(0);
  const items = response.query === query ? response.items : [],
    status = !query.trim()
      ? ""
      : response.query !== query
        ? "Cargando"
        : response.error ||
          (!items.length ? "Nada con ese nombre en el archivo." : "");
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((r) => setResponse({ query, items: r.items }))
        .catch((e) => {
          if (e.name !== "AbortError")
            setResponse({
              query,
              items: [],
              error: "No se pudo abrir el archivo.",
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry]);
  return (
    <div aria-busy={status === "Cargando"}>
      <p role="status" className="search-busy">
        {status}
      </p>
      {status === "No se pudo abrir el archivo." && (
        <button className="text-button" onClick={() => setRetry((v) => v + 1)}>
          Reintentar
        </button>
      )}
      {["Jugadores", "Parejas", "Situaciones", "Partidos"].map((group) => {
        const rows = items.filter(
          (i) => i.group === group && (!first || i.group === "Partidos"),
        );
        return rows.length ? (
          <section className="search-group" key={group}>
            <h3>{group}</h3>
            {rows.map((row) => (
              <Link
                onClick={choose}
                className="search-result"
                href={
                  first
                    ? `/match/${first}?junto=${row.href.split("/").pop()}#comparar`
                    : row.href
                }
                key={row.href}
              >
                {row.name}
                {row.detail && <small>{row.detail}</small>}
              </Link>
            ))}
          </section>
        ) : null;
      })}
    </div>
  );
}
const modes = [
  ["Leer", "/"],
  ["Situaciones", "/situaciones"],
  ["Alguien", "/alguien"],
];
export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    menu = useRef<HTMLDialogElement>(null),
    search = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState(""),
    [scrolled, setScrolled] = useState(false),
    [theme, setTheme] = useState("system"),
    [themeOpen, setThemeOpen] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let mode = "system";
      try {
        mode = localStorage.getItem("deuce-cuaderno-theme") || "system";
      } catch {}
      document.documentElement.setAttribute(
        "data-theme",
        mode === "system" ? (media.matches ? "dark" : "light") : mode,
      );
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const close = () => {
    menu.current?.close();
    search.current?.close();
    trigger.current?.focus();
  };
  const open = (which: "menu" | "search", button: HTMLButtonElement) => {
    trigger.current = button;
    (which === "menu" ? menu : search).current?.showModal();
  };
  const active =
    path.startsWith("/situaciones") || path.startsWith("/torneo")
      ? "Situaciones"
      : path.startsWith("/jugadores") || path.startsWith("/players") ||
          path.startsWith("/rivalries") ||
          path === "/alguien"
        ? "Alguien"
        : "Leer";
  function changeTheme(mode: string) {
    setTheme(mode);
    try {
      localStorage.setItem("deuce-cuaderno-theme", mode);
    } catch {}
    document.documentElement.setAttribute(
      "data-theme",
      mode === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode,
    );
  }
  return (
    <>
      <a className="skip" href="#main-content">
        Saltar al contenido
      </a>
      <header className={`topbar ${scrolled ? "scrolled" : ""}`}>
        <div className="bar-inner">
          <Link className="wordmark" href="/">
            DEUCE
          </Link>
          <nav className="modes" aria-label="Modos de lectura">
            {modes.map(([name, href]) => (
              <Link
                key={name}
                href={href}
                aria-current={active === name ? "page" : undefined}
              >
                {name}
              </Link>
            ))}
          </nav>
          <button
            className="bar-search"
            onClick={(e) => open("search", e.currentTarget)}
            aria-label="Buscar jugador, torneo o situación"
          >
            <Search />
            Jugador, torneo o situación
          </button>
          <div className="mobile-tools">
            <button
              className="icon-button"
              aria-label="Buscar"
              onClick={(e) => open("search", e.currentTarget)}
            >
              <Search />
            </button>
            <button
              className="icon-button"
              aria-label="Abrir menú"
              onClick={(e) => open("menu", e.currentTarget)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="page">
        {children}
      </main>
      <footer className="footer">
        <Link href="/info">Cómo se lee</Link>
        <Link href="/credits">Fotografías</Link>
        <button
          className="text-button"
          aria-expanded={themeOpen}
          onClick={() => {
            try {
              setTheme(
                localStorage.getItem("deuce-cuaderno-theme") || "system",
              );
            } catch {}
            setThemeOpen(!themeOpen);
          }}
        >
          Tema
        </button>
        {themeOpen && (
          <div className="theme-switch" role="group" aria-label="Tema">
            {[
              ["system", "Sistema"],
              ["light", "Claro"],
              ["dark", "Oscuro"],
            ].map(([value, label]) => (
              <button
                key={value}
                className="text-button"
                aria-pressed={theme === value}
                onClick={() => changeTheme(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="copyright">© {new Date().getFullYear()} DEUCE</span>
      </footer>
      <dialog
        aria-label="Modos de lectura"
        className="quiet-dialog menu-dialog"
        ref={menu}
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="dialog-head">
          <span className="wordmark">DEUCE</span>
          <button
            className="icon-button"
            aria-label="Cerrar menú"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Modos de lectura móvil">
          {modes.map(([name, href]) => (
            <Link key={name} href={href} onClick={close}>
              {name}
            </Link>
          ))}
        </nav>
      </dialog>
      <dialog
        aria-label="Buscar en el archivo"
        className="quiet-dialog search-dialog"
        ref={search}
        onClose={() => trigger.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="dialog-head">
          <h2>Buscar en el archivo</h2>
          <button
            className="icon-button"
            aria-label="Cerrar búsqueda"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form action="/buscar" onSubmit={close}>
          <label className="field">
            <span>Jugador, torneo, año o situación</span>
            <input
              autoFocus
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cinco sets, 30–30, Isner…"
              autoComplete="off"
            />
          </label>
        </form>
        {query && (
          <button className="text-button" onClick={() => setQuery("")}>
            Limpiar
          </button>
        )}
        <SearchResults query={query} choose={close} />
        <p className="micro section">
          <Link href={`/buscar?q=${encodeURIComponent(query)}`} onClick={close}>
            Abrir búsqueda con filtros
          </Link>
        </p>
      </dialog>
    </>
  );
}
