import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Suspense } from 'react';
import ArchiveFreshness from '@/components/ArchiveFreshness';
import { preparedManifest } from '@/lib/revista/read-records';
async function FooterFreshness(){return <ArchiveFreshness manifest={await preparedManifest()} compact/>;}
export function DeuceFooter() {
  return <footer className="deuce-footer">
    <span className="footer-court-mark" aria-hidden="true"><i/><i/></span>
    <div className="footer-brand"><Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link><div><span className="footer-kicker">Punto a punto. Año a año.</span><h2>El archivo del tenis<br />desde 1968.</h2></div></div>
    <div className="footer-right"><Link className="footer-entry" href="/buscar"><span>Entrar al archivo</span><ArrowUpRight size={22} aria-hidden="true"/></Link><div className="footer-nav-groups"><nav className="footer-nav" aria-label="Explorar el archivo"><strong>Explorar</strong>{[['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/torneos'],['Comparar','/comparar']].map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</nav><nav className="footer-nav" aria-label="Información del proyecto"><strong>DEUCE</strong>{[['Cómo se lee','/info'],['Cobertura','/cobertura'],['Créditos','/credits'],['Historias','/historias']].map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</nav></div></div>
    <div className="footer-meta"><Suspense fallback={null}><FooterFreshness/></Suspense><p className="legal">© {new Date().getUTCFullYear()} DEUCE</p></div>
  </footer>;
}
