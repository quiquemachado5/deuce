'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export function DeuceFooter() {
  const footer = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = footer.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      element.classList.add('is-visible');
      return;
    }

    let visible = false;
    let frame = 0;
    element.classList.add('footer-motion-ready');

    const updateLight = () => {
      const rect = element.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const offset = Math.max(-1, Math.min(1, (progress - 0.5) * 2)) * 38;
      element.style.setProperty('--footer-parallax-a', `${offset}px`);
      element.style.setProperty('--footer-parallax-b', `${offset * -0.55}px`);
      frame = 0;
    };
    const queueLight = () => {
      if (visible && !frame) frame = window.requestAnimationFrame(updateLight);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (entry.isIntersecting) element.classList.add('is-visible');
      else if (entry.boundingClientRect.top > window.innerHeight) element.classList.remove('is-visible');
      queueLight();
    }, { rootMargin: '120px 0px' });

    observer.observe(element);
    window.addEventListener('scroll', queueLight, { passive: true });
    window.addEventListener('resize', queueLight, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', queueLight);
      window.removeEventListener('resize', queueLight);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <footer className="deuce-footer" ref={footer}>
    <div className="footer-brand">
      <Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
      <p>Resultados, contexto y estadísticas del tenis profesional desde 1968.</p>
    </div>
    <nav className="footer-navigation" aria-label="Navegación del pie">
      <div>
        <strong>Explorar</strong>
        <Link href="/buscar">Partidos</Link>
        <Link href="/records">Récords</Link>
        <Link href="/jugadores">Jugadores</Link>
        <Link href="/torneos">Torneos</Link>
      </div>
      <div>
        <strong>DEUCE</strong>
        <Link href="/info">Cómo se lee</Link>
        <Link href="/cobertura">Cobertura</Link>
        <Link href="/licencias">Licencias</Link>
        <Link href="/comparar">Comparar</Link>
      </div>
    </nav>
    <div className="footer-bottom">
      <span>© {new Date().getUTCFullYear()} DEUCE · Archivo en construcción continua</span>
      <span className="footer-credit">Made by quiquicius</span>
    </div>
  </footer>;
}
