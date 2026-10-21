"use client";

import { useId, useRef, type ReactNode } from "react";
import { useRoutedTabs } from "./useRoutedTabs";

type PeoplePanel = { id: string; label: string; content: ReactNode };

export default function PeopleTabs({
  panels,
  initial = "resumen",
  baseHref,
}: {
  panels: PeoplePanel[];
  initial?: string;
  baseHref: string;
}) {
  const { active, activate } = useRoutedTabs(
    panels.map((panel) => panel.id),
    panels.some((panel) => panel.id === initial) ? initial : panels[0].id,
    baseHref,
  );
  const prefix = useId();
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  return (
    <div className="ry-people-tabs">
      <div
        className="ry-people-tablist"
        role="tablist"
        aria-label="Análisis del jugador"
      >
        {panels.map((panel, index) => (
          <a
            key={panel.id}
            ref={(element) => {
              links.current[index] = element;
            }}
            href={`${baseHref}${baseHref.includes("?") ? "&" : "?"}vista=${panel.id}`}
            role="tab"
            id={`${prefix}-${panel.id}-tab`}
            aria-controls={`${prefix}-${panel.id}-panel`}
            aria-selected={panel.id === active}
            tabIndex={panel.id === active ? 0 : -1}
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
                    ? (index + panels.length - 1) % panels.length
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
        <div
          key={panel.id}
          id={`${prefix}-${panel.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${prefix}-${panel.id}-tab`}
          hidden={active !== panel.id}
          tabIndex={0}
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
