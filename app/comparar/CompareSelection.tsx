"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { avatarPhotoStyle } from "@/lib/photo-style";

type Selection = {
  name: string;
  country?: string;
  photo?: {
    src: string;
    objectPosition?: string;
    avatarCrop?: { x: number; y: number; width: number; height: number };
  };
};

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

/** The submitted filters stay native; the mobile dock keeps the current pair in sight. */
export default function CompareSelection({
  initial,
  children,
}: {
  initial: Selection[];
  children: ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [names, setNames] = useState(initial.map((player) => player.name));
  const [inView, setInView] = useState(true);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!form.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "-90px 0px 0px" },
    );
    observer.observe(form.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className="pd-compare-builder"
      onFocusCapture={() => setEditing(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setEditing(false);
      }}
    >
      <form
        ref={form}
        id="player-comparison-form"
        action="/comparar"
        className="dx-filter-panel"
        onInput={(event) => {
          const target = event.target;
          if (
            target instanceof HTMLInputElement &&
            ["a", "b"].includes(target.name)
          ) {
            const index = target.name === "a" ? 0 : 1;
            setNames((current) =>
              current.map((name, side) =>
                side === index ? target.value : name,
              ),
            );
          }
        }}
      >
        {children}
      </form>
      <div
        className="pd-compare-dock"
        hidden={inView && !editing}
        aria-label="Jugadores de la comparación"
      >
        <div className="pd-compare-dock-pair">
          {names.map((name, index) => {
            const known =
              name === initial[index].name ? initial[index] : undefined;
            return (
              <div className="pd-compare-dock-person" key={index}>
                <span className="pd-compare-dock-avatar" aria-hidden="true">
                  {known?.photo ? (
                    <Image
                      src={known.photo.src}
                      width={64}
                      height={64}
                      alt=""
                      style={avatarPhotoStyle(known.photo)}
                      unoptimized
                    />
                  ) : (
                    name
                      .trim()
                      .split(/\s+/)
                      .map((part) => part[0])
                      .filter(
                        (_, i, parts) => i === 0 || i === parts.length - 1,
                      )
                      .join("") || "?"
                  )}
                </span>
                <div>
                  <span>Jugador {index + 1}</span>
                  <strong>
                    <span>{name.trim() || "Elige jugador"}</span>
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="submit"
          form="player-comparison-form"
          className="pd-compare-dock-submit"
        >
          Comparar <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
