"use client";

import { useEffect, useRef, useState } from "react";

function formatProgress(value: number, finalDisplay: string) {
  if (finalDisplay.includes("%")) {
    const decimals = finalDisplay.includes(",") ? 1 : 0;
    return `${value.toLocaleString("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}%`;
  }

  return Math.round(value).toLocaleString("es-ES");
}

export default function RecordsAnimatedValue({
  value,
  display,
}: {
  value: number;
  display: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(display);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        const start = performance.now();
        const duration = 950;

        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 4);
          setShown(
            progress === 1 ? display : formatProgress(value * eased, display),
          );
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        setShown(formatProgress(0, display));
        frame = requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [display, value]);

  return <span ref={ref}>{shown}</span>;
}
