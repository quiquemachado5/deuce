"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
export default function ParallaxPhoto({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = frame.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = node.getBoundingClientRect();
        if (box.bottom > 0 && box.top < innerHeight)
          node.style.setProperty(
            "--photo-shift",
            `${Math.max(-28, Math.min(28, (innerHeight / 2 - box.top - box.height / 2) * 0.055))}px`,
          );
      });
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", update);
    };
  }, []);
  return (
    <div className="editorial-parallax" ref={frame}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width:759px) 100vw, 1240px"
        preload
      />
    </div>
  );
}
