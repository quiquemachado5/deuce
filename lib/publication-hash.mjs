import {createHash} from 'node:crypto';
const stableValue=(value)=>{
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
    .filter(([,entry])=>entry!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>[key,stableValue(entry)]));
  return value;
};

export function publicationSummaryHash(match) {
  const { raw_fixture: _fixture, raw_point_tape: _tape, point_tape, statistics, listingCapabilities: storedCapabilities, editorial_highlight:_derivedHighlight, context, ...summary } = match;
  void _fixture; void _tape; void _derivedHighlight;
  const listingCapabilities = {
    statistics: storedCapabilities?.statistics ?? (statistics?.length || 0) > 0,
    points: storedCapabilities?.points ?? (point_tape?.length || 0) > 0,
  };
  return createHash('sha256').update(JSON.stringify(stableValue({
    ...summary,
    tour: match.tour || 'atp',
    ...(context&&Object.keys(context).length?{context}:{}),
    listingCapabilities,
  }))).digest('hex').slice(0, 24);
}

