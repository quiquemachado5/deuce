"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "@/app/tournaments/tournament-directory.module.css";

export type TournamentFilterGroup = {
  label: string;
  items: { href: string; label: string; active: boolean }[];
};

export default function TournamentBrowsePicker({ groups, selection }: { groups: TournamentFilterGroup[]; selection: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) detailsRef.current.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return <details ref={detailsRef} className={styles.filterMenu} onKeyDown={event => {
    if (event.key === "Escape" && detailsRef.current?.open) {
      detailsRef.current.open = false;
      detailsRef.current.querySelector("summary")?.focus();
    }
  }}>
    <summary className={styles.filterTrigger} aria-label={`Filtrar torneos: ${selection}`}>
      <span>{selection}</span><ChevronDown size={19} aria-hidden="true" />
    </summary>
    <nav className={styles.filterPanel} aria-label="Circuito y categoría de torneos">
      {groups.map(group => <div className={styles.filterGroup} role="group" aria-label={group.label} key={group.label}>
        <p className={styles.filterGroupTitle}>{group.label}</p>
        {group.items.map(item => <Link key={item.href} className={styles.filterLink} href={item.href} aria-current={item.active ? "page" : undefined} onClick={() => {
          if (detailsRef.current) detailsRef.current.open = false;
        }}>{item.label}</Link>)}
      </div>)}
    </nav>
  </details>;
}
