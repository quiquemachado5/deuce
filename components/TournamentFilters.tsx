"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "@/app/tournaments/tournament-directory.module.css";

export type TournamentFilterItem = {
  href: string;
  label: string;
  active: boolean;
};

export default function TournamentFilters({ items, ariaLabel = 'Categorías de torneos' }: { items: TournamentFilterItem[]; ariaLabel?: string }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const activeHref = items.find(item => item.active)?.href;

  useEffect(() => {
    const shell = shellRef.current;
    const active = activeRef.current;
    if (!shell || !active || shell.scrollWidth <= shell.clientWidth) return;
    const shellBox = shell.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    shell.scrollTo({ left: Math.max(0, shell.scrollLeft + activeBox.left - shellBox.left - (shell.clientWidth - active.clientWidth) / 2), behavior: "auto" });
  }, [activeHref]);

  return <div ref={shellRef} className={styles.filterShell}>
    <nav className={styles.filters} aria-label={ariaLabel}>
      {items.map(item => <Link ref={item.active ? activeRef : undefined} className={styles.filterLink} key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</Link>)}
    </nav>
  </div>;
}
