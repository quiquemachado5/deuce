import type { RecordManifest } from './snapshot';
import type { EditionAudit } from '../edition-audit';
import { editionCompleteness } from '../edition-audit';

/** Intentional reductions require review, never an unnoticed degraded build. */
export function assertReleaseCoverage(previous: RecordManifest, current: RecordManifest) {
  if (!Number.isSafeInteger(previous.matchCount) || !Array.isArray(previous.pieces)) throw new Error('Published baseline is invalid');
  if (current.matchCount < previous.matchCount) throw new Error('Release would lose published matches');
  for (const metric of previous.pieces.filter(piece => piece.measured)) {
    const next = current.pieces.find(piece => piece.id === metric.id);
    if (!next || next.sample < metric.sample) throw new Error(`Release would lose measured coverage: ${metric.id}`);
  }
}

/** A publication may add an edition in progress, but it cannot reopen a draw already verified as complete. */
export function assertEditionCoverage(previous: EditionAudit[], current: EditionAudit[]) {
  const key=(row:EditionAudit)=>`${row.tournament}|${row.year}|${row.category}`;
  const withStatus=(row:EditionAudit):EditionAudit=>({...row,...editionCompleteness(row)});
  const next=new Map(current.map(row=>withStatus(row)).map(row=>[key(row),row]));
  for(const baseline of previous.map(withStatus).filter(row=>row.completeDraw===true)){
    const candidate=next.get(key(baseline));
    if(!candidate||candidate.completeDraw!==true)throw new Error(`Release would make a complete edition incomplete: ${baseline.tournament} ${baseline.year}`);
    for(const round of ['5','6','7'])if((candidate.rounds[round]||0)<(baseline.rounds[round]||0))throw new Error(`Release would lose late-round coverage: ${baseline.tournament} ${baseline.year}`);
  }
}
