import Link from 'next/link';
import { Suspense } from 'react';
import ArchiveFreshness from '@/components/ArchiveFreshness';
import { preparedManifest } from '@/lib/revista/read-records';
async function FooterFreshness(){return <ArchiveFreshness manifest={await preparedManifest()} compact/>;}
export function DeuceFooter() {
  return <footer className="deuce-footer">
    <Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
    <h2>El archivo del tenis<br />desde 1968.</h2>
    <div className="footer-right"><nav className="footer-nav" aria-label="Archivo y proyecto">{[['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/torneos'],['Comparar','/comparar'],['Cómo se lee','/info'],['Cobertura','/cobertura'],['Créditos','/credits'],['Historias','/historias']].map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
      <div className="footer-meta"><Suspense fallback={null}><FooterFreshness/></Suspense><p className="legal">© {new Date().getUTCFullYear()} DEUCE</p></div>
    </div>
  </footer>;
}
