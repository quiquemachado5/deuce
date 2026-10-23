"use client";

import { useEffect, useRef } from "react";

const formatter = new Intl.NumberFormat("es-ES");

export default function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatter.format(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span ref={ref}>{formatter.format(value)}</span>;
}
