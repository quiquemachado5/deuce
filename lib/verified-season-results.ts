import references from './verified-season-results.json';
import type { Match } from './types';
import {canonicalTournamentName} from './tournament-identity';

const fold=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const byId=new Map(references.map(row=>[`${row.tour}:${row.year}:${row.matchId}`,row]));

/** Result-only repairs: circuit, season, fixture, round and both people must agree. */
export function verifiedSeasonResult(match:Match):Match {
  const row=byId.get(`${match.tour||'atp'}:${match.year}:${match.match_id}`);
  if(!row||!['Finished','Review','unresolved'].includes(match.status)||canonicalTournamentName(match.tournament,match.year,match.category,match.tour)!==row.tournament||match.round!==row.round)return match;
  const forward=fold(match.player1.name)===fold(row.first)&&fold(match.player2.name)===fold(row.second);
  const reverse=fold(match.player1.name)===fold(row.second)&&fold(match.player2.name)===fold(row.first);
  if(!forward&&!reverse)return match;
  const unplayed=row.status==='Walkover'||row.status==='Cancelled';
  const tokens=(unplayed?[]:row.score.split(' ')).map(token=>reverse?token.replace(/^(\d+)–(\d+)/,'$2–$1'):token);
  const games=tokens.map(token=>token.match(/^(\d+)–(\d+)/)!.slice(1).map(Number));
  const winner=(reverse?3-row.winner:row.winner) as 1|2;
  const firstName=('correctedFirst' in row&&typeof row.correctedFirst==='string')?row.correctedFirst:row.first;
  const secondName=('correctedSecond' in row&&typeof row.correctedSecond==='string')?row.correctedSecond:row.second;
  const player1Name=reverse?secondName:firstName,player2Name=reverse?firstName:secondName;
  const identityChanged=player1Name!==match.player1.name||player2Name!==match.player2.name;
  const qualifying='qualifying' in row&&row.qualifying===true;
  const changed=identityChanged||JSON.stringify(games)!==JSON.stringify(match.score_summary.games)||winner!==match.winner||match.status!==row.status;
  return {...match,status:row.status,winner:row.status==='Cancelled'?null:winner,final_score:unplayed?(row.status==='Walkover'?'W/O':'Cancelado'):tokens.join(' '),
    player1:player1Name===match.player1.name?match.player1:{name:player1Name,seed:null},player2:player2Name===match.player2.name?match.player2:{name:player2Name,seed:null},
    ...(qualifying?{round:'Previa · primera ronda'}:{}),
    ...('correctedTournament' in row&&typeof row.correctedTournament==='string'?{tournament:row.correctedTournament}:{}),
    ...('correctedCategory' in row&&typeof row.correctedCategory==='string'?{category:row.correctedCategory}:{}),
    score_summary:{...match.score_summary,games,sets:[games.filter(([a,b])=>a>b).length,games.filter(([a,b])=>b>a).length],...(changed?{points:[],server:null,is_tiebreak:false,win_probability_p1:null,match_tiebreak:undefined}:{})},
    statistics:changed?[]:match.statistics,point_tape:changed?[]:match.point_tape,
    context:{...match.context,...(identityChanged?{rank1:null,rank2:null,age1:null,age2:null}:{}),...(qualifying?{qualifying:true,format:'BO3'}:{}),resultSource:row.source,resultReviewedAt:row.reviewedAt,metadataSources:[...(match.context?.metadataSources||[]).filter(source=>source.field!=='resultado'),{field:'resultado',url:row.corroboration}]}};
}
