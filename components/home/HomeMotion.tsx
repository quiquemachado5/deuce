"use client";

import { useEffect, useRef } from "react";

/** Progressive enhancement: without JS or with reduced motion, every fact stays visible. */
export default function HomeMotion({ children, className }: { children: React.ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const intro = element.querySelector<HTMLElement>("[data-intro]");
    const records = element.querySelector<HTMLElement>("[data-records]");
    const slides = [...element.querySelectorAll<HTMLElement>("[data-record-slide]")];
    const photos = [...element.querySelectorAll<HTMLElement>("[data-material]")];
    const tones = [...document.querySelectorAll<HTMLElement>("[data-home-tone]")];
    const header = document.querySelector<HTMLElement>("[data-home-header]");
    let frame = 0;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const render = () => {
      frame = 0;
      const height = window.innerHeight;
      if (!media.matches) {
        if (intro) element.style.setProperty("--intro-opacity", String(1 - clamp(-intro.getBoundingClientRect().top / (height * .7))));
        if (records) {
          const rect = records.getBoundingClientRect();
          const progress = clamp(-rect.top / Math.max(1, rect.height - height)) * 2;
          slides.forEach((slide, index) => {
            const distance = Math.abs(progress - index);
            const opacity = clamp((.66 - distance) / .32);
            slide.style.setProperty("--record-opacity", String(opacity));
            slide.style.setProperty("--record-offset", `${(index - progress) * 18}px`);
          });
        }
        photos.forEach(photo => {
          const rect = photo.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < height) photo.style.setProperty("--image-offset", `${Math.max(-height * .05, Math.min(height * .05, -rect.top * .08))}px`);
        });
      }
      let tone = "dark";
      for (const section of tones) if (section.getBoundingClientRect().top <= 48) tone = section.dataset.homeTone || "dark";
      if (header) header.dataset.tone = tone;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    const configure = () => { element.dataset.motion = media.matches ? "off" : "on"; schedule(); };
    configure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", configure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", configure);
    };
  }, []);
  return <div className={className} ref={root}>{children}</div>;
}
