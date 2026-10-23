"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import HomeSearch from "./HomeSearch";
import styles from "@/app/home-story.module.css";

const navigation = [["Partidos", "/buscar"], ["Récords", "/records"], ["Jugadores", "/jugadores"], ["Torneos", "/tournaments"], ["Cara a cara", "/comparar"]] as const;

export default function HomeShell({ children }: { children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<"search" | "menu" | null>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanel("search");
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!panel) { element.close(); return; }
    element.showModal();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    element.querySelector<HTMLInputElement>("input")?.focus();
    return () => { document.documentElement.style.overflow = overflow; element.close(); };
  }, [panel]);

  return <div className={styles.shell}>
    <a className={styles.skip} href="#main-content">Saltar al contenido</a>
    <header className={styles.topbar} data-home-header data-tone="dark">
      <div className={styles.topbarInner}>
        <Link href="/" className={styles.wordmark} aria-label="DEUCE, inicio">DEUCE</Link>
        <nav className={styles.desktopNav} aria-label="Principal">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Buscar (Control o Comando K)" aria-haspopup="dialog" onClick={() => setPanel("search")}><Search size={18} strokeWidth={1.5} /></button>
          <button type="button" className={styles.menuTrigger} aria-label="Abrir menú" aria-haspopup="dialog" onClick={() => setPanel("menu")}><Menu size={20} strokeWidth={1.5} /></button>
        </div>
      </div>
    </header>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <footer className={styles.footer} data-home-tone="light">
      <div className={styles.footerInner}>
        <div className={styles.footerColumns}>
          <nav aria-label="Archivo"><h2>Archivo</h2><Link href="/buscar">Partidos</Link><Link href="/jugadores">Jugadores</Link><Link href="/tournaments">Torneos</Link></nav>
          <nav aria-label="Explorar"><h2>Explorar</h2><Link href="/records">Récords</Link><Link href="/comparar">Cara a cara</Link></nav>
          <nav aria-label="El proyecto"><h2>El proyecto</h2><Link href="/info">Cómo se lee</Link><Link href="/cobertura">Cobertura del archivo</Link><Link href="/credits">Créditos de las fotos</Link></nav>
        </div>
        <p className={styles.copyright}>Copyright © {new Date().getFullYear()} DEUCE. El archivo del tenis desde 1968.</p>
      </div>
    </footer>
    <dialog ref={dialog} className={styles.dialog} data-panel={panel || undefined} aria-label={panel === "menu" ? "Menú principal" : "Buscar en el archivo"} onCancel={() => setPanel(null)} onClose={() => setPanel(null)} onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div className={styles.dialogInner}>
        <button className={styles.close} type="button" onClick={() => setPanel(null)} aria-label="Cerrar"><X size={22} /></button>
        {panel === "search" ? <><h2>Buscar</h2><HomeSearch id="navigation-search" onSearch={() => setPanel(null)} /><p className={styles.searchHint}>Intro para buscar · Esc para cerrar</p></> : <nav aria-label="Navegación móvil">{navigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setPanel(null)}>{label}</Link>)}</nav>}
      </div>
    </dialog>
  </div>;
}
