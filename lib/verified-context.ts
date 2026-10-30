import type { Match } from './types';

/** Reviewed field-level evidence. Never extrapolate an edition's tier into another season. */
export const contextSources = {
  canada2026: 'https://www.atptour.com/en/tournaments/canada/421/overview',
  finals: 'https://www.nittoatpfinals.com/en/heritage/results-2000-2023',
  davis: 'https://davis-cup-web-prod.stadion.io/en/about/format',
  laver: 'https://lavercup.com/how-the-laver-cup-works',
  united: 'https://www.wtatennis.com/news/2989339/united-cup-2023-draw-format-prize-money-and-everything-you-need-to-know',
} as const;
const fold=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
type Reference={tournament:string;year:number;players:[string,string];games:number[][];date?:string;endDate?:string;minutes?:number;round?:string;source:string};
export const matchContextReferences:Reference[]=[
  {tournament:'Wimbledon',year:2008,players:['Rafael Nadal','Roger Federer'],games:[[6,4],[6,4],[6,7],[6,7],[9,7]],date:'2008-07-06',source:'https://www.bbc.co.uk/sport/tennis/44517976'},
  {tournament:'Wimbledon',year:2010,players:['John Isner','Nicolas Mahut'],games:[[6,4],[3,6],[6,7],[7,6],[70,68]],date:'2010-06-22',endDate:'2010-06-24',minutes:665,source:'https://www.wimbledon.com/pdf/2020_Compendium.pdf'},
  {tournament:'Wimbledon',year:2019,players:['Novak Djokovic','Roger Federer'],games:[[7,6],[1,6],[7,6],[4,6],[13,12]],date:'2019-07-14',minutes:297,source:'https://novakdjokovic.com/en/news/tennis/novak-beats-roger-in-epic-wins-fifth-wimbledon-crown/'},
  {tournament:'Australian Open',year:2012,players:['Novak Djokovic','Rafael Nadal'],games:[[5,7],[6,4],[6,2],[6,7],[7,5]],date:'2012-01-29',endDate:'2012-01-30',minutes:353,source:'https://www.bbc.co.uk/sport/tennis/16773908'},
  {tournament:'Australian Open',year:2023,players:['Andy Murray','Thanasi Kokkinakis'],games:[[4,6],[6,7],[7,6],[6,3],[7,5]],date:'2023-01-19',endDate:'2023-01-20',minutes:345,source:'https://www.usopen.org/amp/en_US/news/articles/2023-01-19/andy_murray_wins_longest_match_of_career_against_thanasi_kokkinakis_to_reach_round_3_at_australian_open.html'},
  {tournament:'Vienna',year:1986,players:['Brad Gilbert','Karel Novacek'],games:[[3,6],[6,3],[7,5],[6,0]],date:'1986-10-26',source:'https://www.atptour.com/en/scores/results-archive?year=1986'},
  {tournament:'Lyon',year:2008,players:['Julien Benneteau','Robin Soderling'],games:[[3,6],[7,6],[1,6]],date:'2008-10-26',source:'https://www.atptour.com/en/scores/results-archive?year=2008'},
  {tournament:'Basel',year:2014,players:['David Goffin','Roger Federer'],games:[[2,6],[2,6]],date:'2014-10-26',source:'https://www.atptour.com/en/scores/results-archive?year=2014'},
  {tournament:'Bucharest',year:2026,players:['Daniel Merida Aguilar','Otto Virtanen'],games:[[7,6],[5,7],[7,5]],round:'Ronda de 32',source:'https://www.tennis.com/tournaments/tiriac-open/matches/o-virtanen-vs-d-merida-2026-03-31'},
];
const referencesByEdition=new Map<string,Reference[]>();
for(const reference of matchContextReferences){const key=reference.tournament+'|'+reference.year;referencesByEdition.set(key,[...(referencesByEdition.get(key)||[]),reference]);}
export function verifiedContext(input:Match):Match {
  let match=input;
  const evidence=(field:string,url:string)=>{
    const sources=match.context?.metadataSources||[];
    if(!sources.some(item=>item.field===field&&item.url===url))match={...match,context:{...match.context,metadataSources:[...sources,{field,url}]}};
  };
  const category=(value:string,url:string)=>{if(!match.category||/nivel no especificado|Otro torneo ATP/i.test(match.category)){match={...match,category:value};evidence('Categoría',url);}};
  const surface=(value:Match['surface'],url:string)=>{if(match.surface==='unknown'){match={...match,surface:value};evidence('Superficie',url);}};
  if(match.tour!=='wta'&&match.year===2026&&match.tournament==='Canada'){category('Masters 1000',contextSources.canada2026);surface('hard',contextSources.canada2026);}
  if(match.tour!=='wta'&&match.year>=2021&&match.year<=2025&&/^(Finals - Turin|ATP Finals|Tour Finals)$/.test(match.tournament)){
    category('ATP Finals',contextSources.finals);surface('hard',contextSources.finals);
    if(match.context?.indoor==null){match={...match,context:{...match.context,indoor:true}};evidence('Bajo techo',contextSources.finals);}
  }
  if(match.year>=2023&&match.year<=2026){
    if(match.tour!=='wta'&&/^Davis Cup(?: - | Single Matches)/.test(match.tournament))category('Copa Davis',contextSources.davis);
    if(match.tournament==='United Cup'){category('United Cup',contextSources.united);if(match.year===2023)surface('hard',contextSources.united);}
    if(match.tour!=='wta'&&match.tournament==='Laver Cup'){category('Laver Cup',contextSources.laver);surface('hard',contextSources.laver);}
  }
  for(const reference of referencesByEdition.get(match.tournament+'|'+match.year)||[]){
    const players=[fold(match.player1.name),fold(match.player2.name)],names=reference.players.map(fold);
    const reverse=players[0]===names[1]&&players[1]===names[0];
    if(!reverse&&!(players[0]===names[0]&&players[1]===names[1]))continue;
    const games=reverse?match.score_summary.games.map(([a,b])=>[b,a]):match.score_summary.games;
    if(JSON.stringify(games)!==JSON.stringify(reference.games))continue;
    if(reference.date&&match.context?.dateLabel!=='Fecha del partido'){match={...match,context:{...match.context,date:reference.date,dateLabel:'Fecha del partido'}};evidence('Fecha de inicio del partido',reference.source);}
    if(reference.endDate&&!match.context?.endDate){match={...match,context:{...match.context,endDate:reference.endDate}};evidence('Fecha de finalización',reference.source);}
    if(reference.minutes&&match.context?.minutes==null){match={...match,context:{...match.context,minutes:reference.minutes}};evidence('Duración',reference.source);}
    if(reference.round&&!match.round){match={...match,round:reference.round};evidence('Ronda',reference.source);}
  }
  return match;
}
