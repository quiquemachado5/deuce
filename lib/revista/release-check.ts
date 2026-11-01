import type { RecordManifest } from './snapshot';
import type { EditionAudit } from '../edition-audit';
import { editionCompleteness } from '../edition-audit';

/** Intentional reductions require review, never an unnoticed degraded build. */
export function assertReleaseCoverage(previous: RecordManifest, current: RecordManifest) {
  if (!Number.isSafeInteger(previous.matchCount) || !Array.isArray(previous.pieces)) throw new Error('Published baseline is invalid');
  if (current.matchCount < previous.matchCount) throw new Error('Release would lose published matches');
  const previousTours = previous.summary?.tours || { atp: previous.matchCount, wta: 0 };
  const currentTours = current.summary?.tours || { atp: current.matchCount, wta: 0 };
  for (const tour of ['atp', 'wta'] as const) {
    if (currentTours[tour] < previousTours[tour]) throw new Error(`Release would lose published ${tour.toUpperCase()} matches`);
  }
  for (const metric of previous.pieces.filter(piece => piece.measured && previous.rulesVersion===current.rulesVersion)) {
    const next = current.pieces.find(piece => piece.id === metric.id);
    if (!next || next.sample < metric.sample) throw new Error(`Release would lose measured coverage: ${metric.id}`);
  }
}

/** A publication may add an edition in progress, but it cannot reopen a draw already verified as complete. */
export function assertEditionCoverage(previous: EditionAudit[], current: EditionAudit[]) {
  const key=(row:EditionAudit)=>`${row.tournament}|${row.year}|${row.category}|${row.tour||'atp'}`;
  const withStatus=(row:EditionAudit):EditionAudit=>({...row,...editionCompleteness(row)});
  const next=new Map(current.map(row=>withStatus(row)).map(row=>[key(row),row]));
  for(const baseline of previous.filter(row=>row.completeDraw===true)){
    const candidate=next.get(key(baseline));
    if(!candidate)throw new Error(`Release would make a complete edition incomplete: ${baseline.tournament} ${baseline.year}`);
    const lateRoundsPreserved=['5','6','7'].every(round=>(candidate.rounds[round]||0)>=(baseline.rounds[round]||0));
    const resolvedPreserved=candidate.completed+candidate.terminal>=baseline.completed+baseline.terminal;
    // Providers can append incomplete duplicate rows after a draw was already
    // verified. They must not erase that verified baseline, while any actual
    // loss of resolved matches or late rounds still blocks publication.
    const onlyAddsPendingRows=candidate.sourceRows>baseline.sourceRows&&resolvedPreserved&&lateRoundsPreserved;
    if(candidate.completeDraw===false&&!onlyAddsPendingRows)throw new Error(`Release would make a complete edition incomplete: ${baseline.tournament} ${baseline.year}`);
    if(!resolvedPreserved)throw new Error(`Release would make a complete edition incomplete: ${baseline.tournament} ${baseline.year}`);
    if(!lateRoundsPreserved)throw new Error(`Release would lose late-round coverage: ${baseline.tournament} ${baseline.year}`);
  }
}
