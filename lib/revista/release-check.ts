import {recordCatalog} from './records';
import {reviewedMeasurementCorrection,type MeasurementCorrection} from './release-source';
import type { RecordManifest } from './snapshot';
import {isReviewedOutsideMainDraw} from '../reviewed-fixture-scope';
import type {Match} from '../types';
import type { EditionAudit } from '../edition-audit';
import { editionCompleteness } from '../edition-audit';

// This shelf is intentionally tied to the UTC calendar day. A circuit can
// have documented matches on one date and none on the next, so its presence
// is not persistent publication coverage.
const EPHEMERAL_RECORD_PIECES = new Set(['tal-dia-como-hoy']);

/** Intentional reductions require review, never an unnoticed degraded build. */
export function assertReleaseCoverage(previous: RecordManifest, current: RecordManifest, reviewedScopeExclusions:Match[]=[], measurementCorrections:MeasurementCorrection[]=[]) {
  if (!Number.isSafeInteger(previous.matchCount) || !Array.isArray(previous.pieces)) throw new Error('Published baseline is invalid');
  // A reviewed rules change may intentionally narrow the public universe. All
  // subsequent publications under that rules version regain the strict guard.
  if (previous.rulesVersion !== current.rulesVersion) return;
  const exclusions={atp:0,wta:0};
  const excludedIds=new Set<string>();
  for(const row of reviewedScopeExclusions){
    const tour=row.tour||'atp',key=`${tour}:${row.match_id}`;
    if(excludedIds.has(key)||!isReviewedOutsideMainDraw(row))throw new Error('Unverified publication scope exclusion');
    excludedIds.add(key);exclusions[tour]++;
  }
  if (current.matchCount < previous.matchCount-reviewedScopeExclusions.length) throw new Error('Release would lose published matches');
  const previousTours = previous.summary?.tours || { atp: previous.matchCount, wta: 0 };
  const currentTours = current.summary?.tours || { atp: current.matchCount, wta: 0 };
  for (const tour of ['atp', 'wta'] as const) {
    if (currentTours[tour] < previousTours[tour]-exclusions[tour]) throw new Error(`Release would lose published ${tour.toUpperCase()} matches`);
  }
  const reviewedIds=new Set<string>();
  for(const correction of measurementCorrections){
    const key=`${correction.current.tour||'atp'}:${correction.current.match_id}`;
    if(reviewedIds.has(key)||!reviewedMeasurementCorrection(correction))throw new Error('Unverified measurement correction');
    reviewedIds.add(key);
  }
  const allowances=(tour:'atp'|'wta')=>{
    const pairs=measurementCorrections.filter(row=>(row.current.tour||'atp')===tour);
    if(!pairs.length)return new Map<string,number>();
    const before=recordCatalog(pairs.map(row=>row.previous),undefined,undefined,true),after=recordCatalog(pairs.map(row=>row.current),undefined,undefined,true);
    return new Map(before.map(row=>[row.id,Math.max(0,row.sample-(after.find(next=>next.id===row.id)?.sample||0))]));
  };
  const catalogues = (manifest: RecordManifest) => ({
    atp: manifest.pieces,
    wta: manifest.circuitPieces?.wta || [],
  });
  const priorCatalogues = catalogues(previous), nextCatalogues = catalogues(current);
  for (const tour of ['atp', 'wta'] as const) {
    const correctedSamples=allowances(tour);
    for (const metric of priorCatalogues[tour].filter(piece => piece.measured)) {
      const next = nextCatalogues[tour].find(piece => piece.id === metric.id);
      const retainedSample=Math.max(0,metric.sample-(correctedSamples.get(metric.id)||0));
      if ((!next&&retainedSample>0) || (next&&next.sample < retainedSample)) throw new Error(`Release would lose measured${tour === 'atp' ? '' : ` ${tour.toUpperCase()}`} coverage: ${metric.id}`);
    }
    const nextIds = new Set(nextCatalogues[tour].map(piece => piece.id));
    const missing = priorCatalogues[tour]
      .filter(piece=>piece.sample>(correctedSamples.get(piece.id)||0))
      .map(piece => piece.id)
      .filter(id => !EPHEMERAL_RECORD_PIECES.has(id) && !nextIds.has(id));
    if (missing.length) throw new Error(`Release would lose ${tour.toUpperCase()} record catalogue entries: ${missing.join(', ')}`);
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
