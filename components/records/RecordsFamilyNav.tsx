"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function RecordsFamilyNav({
  activeKey,
  children,
  className,
}: {
  activeKey: string;
  children: ReactNode;
  className: string;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;

    nav.scrollTo({
      left: Math.max(
        0,
        active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
      ),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [activeKey]);

  return (
    <nav
      ref={navRef}
      className={className}
      aria-label="Familias de estadísticas"
    >
      {children}
    </nav>
  );
}
