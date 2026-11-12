import type { Match } from '../types';
import type { RecordManifest } from './snapshot';
import { eligibleMatch } from '../quality';

function mergeCorrection(previous:Match,local:Match,baselineAt:number) {
  if(previous===local)return previous;
  const revision=(match:Match)=>Math.max(Date.parse(match.provider_revision?.retrieved_at||'')||0,Date.parse(match.context?.resultReviewedAt||'')||0);
  const newer=revision(local)>Math.max(baselineAt,revision(previous));
  const repaired=!eligibleMatch(previous);
  const same=JSON.stringify(local.score_summary.games)===JSON.stringify(previous.score_summary.games)&&local.winner===previous.winner&&local.player1.name===previous.player1.name&&local.player2.name===previous.player2.name;
  // A new source classification is a correction, not a loss of richer evidence.
  // Never restore reconstructed points/derived pressure stats from an old snapshot.
  if(same&&local.context?.pointSource==='reconstructed'&&local.context.derivationVersion!==previous.context?.derivationVersion)return local;
  if(same&&local.context?.derivationVersion==='2026-11-finals-v2'&&
    /^(?:ATP|WTA) Finals$/.test(local.category)&&
    (local.category!==previous.category||local.round!==previous.round||local.tournament!==previous.tournament||local.year!==previous.year))return local;
  const enrichment=same&&revision(local)>=revision(previous)&&!!local.context?.resultReviewedAt&&local.context.resultReviewedAt===previous.context?.resultReviewedAt&&local.statistics.length>previous.statistics.length;
  if(!newer&&!repaired&&!enrichment)return previous;
  if(!eligibleMatch(local))return previous;
  // A list refresh must not erase richer measurements for an unchanged result.
  const statistics=new Map(previous.statistics.map(stat=>[`${stat.player}:${stat.period.toLowerCase()}:${stat.name}`,stat]));
  for(const stat of local.statistics)statistics.set(`${stat.player}:${stat.period.toLowerCase()}:${stat.name}`,stat);
  return same?{...local,provider_revision:newer?local.provider_revision:previous.provider_revision,statistics:[...statistics.values()],point_tape:local.point_tape.length>=previous.point_tape.length?local.point_tape:previous.point_tape,raw_point_tape:local.raw_point_tape||previous.raw_point_tape}:local;
}

/**
 * A production UI build must never replace a newer published archive with an
 * older bundled checkout. Restore the immutable published generation first;
 * the normal release checks still verify every derived record afterwards.
 */
export async function preservePublishedArchive(
  local: Match[],
  published: Pick<RecordManifest, 'matchCount' | 'version'> & {generatedAt?:string},
  loadPublished: (version: string) => Promise<Match[] | undefined>,
) {
  if (!Number.isSafeInteger(published.matchCount) || published.matchCount < 1
    || typeof published.version !== 'string' || !published.version) {
    throw new Error('Published archive baseline is invalid');
  }
  const restored = await loadPublished(published.version);
  if (!Array.isArray(restored) || restored.length !== published.matchCount) {
    throw new Error('Cannot restore the published archive baseline');
  }
  if(restored.some(match=>match.data_source==='mock')||new Set(restored.map(match=>`${match.tour||'atp'}:${match.match_id}`)).size!==restored.length)throw new Error('Published archive baseline is invalid');
  const rows=new Map(restored.map(m=>[`${m.tour||'atp'}:${m.match_id}`,m]));
  for(const m of local){const key=`${m.tour||'atp'}:${m.match_id}`,previous=rows.get(key);rows.set(key,previous?mergeCorrection(previous,m,Date.parse(published.generatedAt||'')||0):m);}
  const result=[...rows.values()];
  return result.length===restored.length&&result.every((match,index)=>match===restored[index])?restored:result;
}
