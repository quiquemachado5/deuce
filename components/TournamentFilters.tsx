"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/app/tournaments/tournament-directory.module.css";

export type TournamentFilterItem = {
  href: string;
  label: string;
  active: boolean;
};

export default function TournamentFilters({ items }: { items: TournamentFilterItem[] }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const activeHref = items.find(item => item.active)?.href;

  useEffect(() => {
    const shell = shellRef.current;
    const active = activeRef.current;
    if (!shell || !active || shell.scrollWidth <= shell.clientWidth) return;
    shell.scrollTo({ left: Math.max(0, active.offsetLeft - (shell.clientWidth - active.clientWidth) / 2), behavior: "auto" });
  }, [activeHref]);

  return <div ref={shellRef} className={styles.filterShell}>
    <nav className={styles.filters} aria-label="Categorías de torneos">
      {items.map(item => <Link ref={item.active ? activeRef : undefined} className={styles.filterLink} key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</Link>)}
    </nav>
  </div>;
}
