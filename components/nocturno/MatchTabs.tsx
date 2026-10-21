"use client";

import { useId, useRef, type ReactNode } from "react";
import { useRoutedTabs } from "./useRoutedTabs";

export type MatchView = "resumen" | "presion" | "medidas" | "alrededor";
export type MatchPanel = { id: MatchView; label: string; content: ReactNode };

/** Links remain usable before hydration; only the selected server panel is shown. */
export default function MatchTabs({
  panels,
  initial = "resumen",
  baseHref,
}: {
  panels: MatchPanel[];
  initial?: MatchView;
  baseHref: string;
}) {
  const { active, activate } = useRoutedTabs(
      panels.map((panel) => panel.id),
      panels.some((panel) => panel.id === initial) ? initial : "resumen",
      baseHref,
    ),
    id = useId(),
    links = useRef<(HTMLAnchorElement | null)[]>([]);
  return (
    <div className="ry-match-tabs">
      <div
        className="ry-match-segments"
        role="tablist"
        aria-label="Lectura del partido"
      >
        {panels.map((panel, index) => (
          <a
            key={panel.id}
            ref={(node) => {
              links.current[index] = node;
            }}
            href={`${baseHref}${baseHref.includes("?") ? "&" : "?"}vista=${panel.id}`}
            role="tab"
            id={`${id}-${panel.id}-tab`}
            aria-controls={`${id}-${panel.id}-panel`}
            aria-selected={active === panel.id}
            tabIndex={active === panel.id ? 0 : -1}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              activate(panel.id);
            }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % panels.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + panels.length) % panels.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? panels.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              activate(panels[next].id);
              links.current[next]?.focus();
            }}
          >
            {panel.label}
          </a>
        ))}
      </div>
      {panels.map((panel) => (
        <section
          key={panel.id}
          id={`${id}-${panel.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${panel.id}-tab`}
          hidden={active !== panel.id}
          className="ry-match-panel"
          tabIndex={0}
        >
          {panel.content}
        </section>
      ))}
    </div>
  );
}
