"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/home-story.module.css";

export default function HomeSearch({ id, onSearch }: { id: string; onSearch?: () => void }) {
  const router = useRouter();
  return <form action="/buscar" role="search" className={styles.searchForm} onSubmit={event => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") || "").trim();
    if (!query) return;
    onSearch?.();
    router.push(`/buscar?${/^\d{4}$/.test(query) ? "year" : "q"}=${encodeURIComponent(query)}`);
  }}>
    <label className={styles.srOnly} htmlFor={id}>Buscar un partido por jugador, torneo o año</label>
    <input id={id} name="q" type="search" placeholder="Jugador, torneo o año" autoComplete="off" enterKeyHint="search" required maxLength={100} />
  </form>;
}
