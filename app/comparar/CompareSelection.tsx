import type {ReactNode} from 'react';

export default function CompareSelection({children}:{children:ReactNode}){
  return <div className="pd-compare-builder"><form id="player-comparison-form" action="/comparar" className="dx-filter-panel archive-unified-toolbar">{children}</form></div>;
}
