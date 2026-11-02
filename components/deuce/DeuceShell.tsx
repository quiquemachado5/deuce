import ArchiveReturnMemory from '@/components/ArchiveReturnMemory';
import Link from 'next/link';
import {Suspense,type ReactNode} from 'react';
import { DeuceFooter } from './DeuceFooter';
import { DeuceTopbar } from './DeuceTopbar';
export function DeuceShell({ children }: { children: ReactNode }) {
  const fallback=<header className="topbar"><Link className="logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true"/>DEUCE</Link><nav aria-label="Principal"><Link href="/buscar">Partidos</Link><Link href="/buscar?tour=wta">WTA</Link><Link href="/records">Récords</Link><Link href="/jugadores">Jugadores</Link><Link href="/torneos">Torneos</Link><Link href="/comparar">Comparar</Link></nav></header>;
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><Suspense fallback={fallback}><DeuceTopbar /></Suspense><ArchiveReturnMemory /><main id="main-content" tabIndex={-1}>{children}</main><DeuceFooter /></>;
}
