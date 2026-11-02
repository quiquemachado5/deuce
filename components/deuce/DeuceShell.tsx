import ArchiveReturnMemory from '@/components/ArchiveReturnMemory';
import {Suspense,type ReactNode} from 'react';
import { DeuceFooter } from './DeuceFooter';
import { DeuceTopbar } from './DeuceTopbar';
import { TopbarCircuitNavigationFallback } from './CircuitNavigationFallback';
export function DeuceShell({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><Suspense fallback={<TopbarCircuitNavigationFallback />}><DeuceTopbar /></Suspense><ArchiveReturnMemory /><main id="main-content" tabIndex={-1}>{children}</main><DeuceFooter /></>;
}
