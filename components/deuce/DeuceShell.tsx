import ArchiveReturnMemory from '@/components/ArchiveReturnMemory';
import type { ReactNode } from 'react';
import { DeuceFooter } from './DeuceFooter';
import { DeuceTopbar } from './DeuceTopbar';
import { PageTransition } from './PageTransition';
export function DeuceShell({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><DeuceTopbar /><PageTransition /><ArchiveReturnMemory /><main id="main-content" tabIndex={-1}>{children}</main><DeuceFooter /></>;
}
