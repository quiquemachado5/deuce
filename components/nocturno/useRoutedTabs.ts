"use client";

import { useEffect, useState } from "react";

/** Keep an instant tab switch shareable and restorable with the browser Back button. */
export function useRoutedTabs<T extends string>(
  ids: readonly T[],
  initial: T,
  baseHref: string,
) {
  const [active, setActive] = useState<T>(initial);
  const choices = ids.join("|");

  useEffect(() => {
    const available = choices.split("|") as T[];
    const fromUrl = () => {
      const value = new URL(window.location.href).searchParams.get("vista") as T;
      setActive(available.includes(value) ? value : initial);
    };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, [baseHref, initial, choices]);

  const activate = (id: T) => {
    setActive(id);
    const url = new URL(baseHref, window.location.origin);
    url.searchParams.set("vista", id);
    window.history.pushState(null, "", url);
  };
  return { active, activate };
}
