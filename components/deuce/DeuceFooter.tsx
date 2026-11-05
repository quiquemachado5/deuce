'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { circuitSectionHref, navigationCircuit, type Circuit } from '@/lib/circuit-navigation';
import { FooterCircuitNavigationFallback } from './CircuitNavigationFallback';

function FooterNavigationLinks({ circuit }: { circuit: Circuit }) {
  return <nav className="footer-navigation" aria-label="Navegación del pie">
    <div>
      <strong>Explorar</strong>
      <Link href={circuitSectionHref('matches',circuit)}>Partidos</Link>
      <Link href={circuitSectionHref('records',circuit)}>Récords</Link>
      <Link href={circuitSectionHref('players',circuit)}>Jugadores</Link>
      <Link href={circuitSectionHref('tournaments',circuit)}>Torneos</Link>
      <Link href={circuitSectionHref('compare',circuit)}>Comparar</Link>
    </div>
    <div>
      <strong>Archivo</strong>
      <Link href="/cobertura">Cobertura</Link>
    </div>
    <div>
      <strong>DEUCE</strong>
      <Link href="/sobre">Sobre DEUCE</Link>
      <Link href="/info">Cómo se lee</Link>
      <Link href="/licencias">Licencias</Link>
    </div>
  </nav>;
}

function CircuitAwareFooterNavigation() {
  const pathname=usePathname(),searchParams=useSearchParams();
  return <FooterNavigationLinks circuit={navigationCircuit(pathname,searchParams)}/>;
}

export function DeuceFooter() {
  return <footer className="deuce-footer" aria-label="Pie de página">
    <div className="footer-atmosphere" aria-hidden="true" />
    <div className="footer-directory">
      <div className="footer-brand">
        <Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
        <p>Resultados y estadísticas de tenis con fuentes, contexto y cobertura documentada.</p>
      </div>
      <Suspense fallback={<FooterCircuitNavigationFallback />}><CircuitAwareFooterNavigation/></Suspense>
      <div className="footer-bottom">
        <span>© {new Date().getUTCFullYear()} DEUCE · Archivo estadístico de tenis</span>
        <span className="footer-credit">Made by quiquicius</span>
      </div>
    </div>
  </footer>;
}
