"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CompareSampleFilters({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const update = () => {
      if (details.current) {
        details.current.open = !media.matches;
        details.current.dataset.ready = "true";
      }
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <details ref={details} className="dx-more-filters" data-responsive="true" open>
      <summary>
        Filtros de la muestra <span>{summary}</span>
      </summary>
      <div>{children}</div>
    </details>
  );
}

/** Keep the comparison form native and compact on every viewport. */
export default function CompareSelection({
  children,
}: {
  initial: unknown[];
  tour: 'atp'|'wta';
  children: ReactNode;
}) {
  return (
    <div className="pd-compare-builder">
      <form
        id="player-comparison-form"
        action="/comparar"
        className="dx-filter-panel archive-unified-toolbar"
      >
        {children}
      </form>
    </div>
  );
}
