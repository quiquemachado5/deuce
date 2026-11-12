import ArchiveOriginTracker from '@/components/ArchiveOriginTracker';
import {Suspense,type ReactNode} from 'react';
import { DeuceFooter } from './DeuceFooter';
import { DeuceTopbar } from './DeuceTopbar';
import { TopbarCircuitNavigationFallback } from './CircuitNavigationFallback';
import {PhotoMotion} from './PhotoMotion';
import { NavigationMotion } from './NavigationMotion';
export function DeuceShell({ children }: { children: ReactNode }) {
  return <><NavigationMotion/><PhotoMotion/><a className="skip-link" href="#main-content">Saltar al contenido</a><Suspense fallback={<TopbarCircuitNavigationFallback />}><DeuceTopbar /></Suspense><main id="main-content" tabIndex={-1}>{children}</main><ArchiveOriginTracker /><DeuceFooter /></>;
}
