import 'server-only';
import {preparedGeneration} from '@/lib/revista/read-records';
import {tournamentMarkFor} from '@/lib/tournament-branding';
import {tournamentName} from '@/lib/labels';
import {courtPhoto} from '@/lib/imagery';
import {decisiveMoments,durationLabel,matchStory,roundLabel,scoreFor,winnerName} from '@/lib/editorial';
import type {Match} from '@/lib/types';

export type GameMatch={id:string;label:string;players:string;year:number;round:string;tournament:string;logo:string;tour:'atp'|'wta';href:string};
export type GameDifficulty={key:'easy'|'hard'|'legendary';label:'Fácil'|'Difícil'|'Legendario';reason:string};
export type GameVisual={src:string;credit:string;position:string;mobilePosition:string};
export type GameEditorial={headline:string;summary:string;moment:string|null;winner:string;score:string;duration:string|null};
export function gameDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function gameId(match:Match){return `${match.tour||'atp'}:${match.match_id}`;}
export function gameMatch(match:Match):GameMatch {const tour=match.tour==='wta'?'wta':'atp';return {id:gameId(match),label:`${match.player1.name} · ${match.player2.name}`,players:`${match.player1.name} contra ${match.player2.name}`,year:match.year,round:match.round,tournament:tournamentName(match.tournament),logo:tournamentMarkFor(match.tournament,tour).src,tour,href:`/match/${match.match_id}`};}
type SearchRow={match:Match;text:string;players:string;tournament:string;round:string;year:string};
type GameCatalog={matches:Match[];byId:Map<string,Match>;search:readonly SearchRow[]};
let catalogCache:{key:string;value:Promise<GameCatalog>}|null=null;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim();
const aliases=(match:Match)=>{
 const tournament=normalize(match.tournament),round=normalize(match.round);
 const tournamentAliases=tournament.includes('roland garros')?' french open ':tournament.includes('us open')?' abierto estados unidos ':'';
 const roundAliases=round.includes('semifinal')?' sf semis ':round.includes('cuartos')?' qf cuartos de final ':round==='final'?' campeonato titulo ':'';
 return `${tournamentAliases}${roundAliases}`;
};
export async function gameCatalog():Promise<GameCatalog>{
 const generation=await preparedGeneration(),key=`${generation.source}:${generation.manifest.version}`;
 if(catalogCache?.key!==key){
  const value=generation.matches().then(rows=>{
   const matches=rows.filter(m=>m.player1?.name&&m.player2?.name&&m.winner&&m.final_score&&m.context?.qualifying!==true);
   return {matches,byId:new Map(matches.map(m=>[gameId(m),m])),search:matches.map(match=>{const players=normalize(`${match.player1.name} ${match.player2.name}`),tournament=normalize(match.tournament),round=normalize(match.round),year=String(match.year);return {match,players,tournament,round,year,text:`${players} ${tournament} ${year} ${round}${aliases(match)}`};})};
  });
  catalogCache={key,value};
  value.catch(()=>{if(catalogCache?.value===value)catalogCache=null;});
 }
 return catalogCache.value;
}
export async function gameArchive(){return (await gameCatalog()).matches;}
export function smartMatchScore(row:SearchRow,query:string){const normalized=normalize(query),tokens=normalized.split(' ').filter(Boolean);if(!tokens.length||!tokens.every(token=>row.text.includes(token)))return 0;let score=20;for(const token of tokens){if(row.players.includes(token))score+=12;if(row.tournament.includes(token))score+=7;if(row.round.includes(token))score+=5;if(row.year===token)score+=8;}if(row.players.includes(normalized))score+=24;if(row.text.startsWith(normalized))score+=10;return score;}
export async function searchGameMatches(query:string){const best:{score:number;match:Match}[]=[];for(const row of (await gameCatalog()).search){const score=smartMatchScore(row,query);if(!score)continue;const entry={score,match:row.match};const index=best.findIndex(item=>score>item.score||(score===item.score&&row.match.year>item.match.year));if(index===-1){if(best.length<12)best.push(entry);}else best.splice(index,0,entry);if(best.length>12)best.pop();}return best.map(item=>gameMatch(item.match));}
const isFeaturedFinal=(m:Match)=>/^(Final|F)$/i.test(m.round);
function gcd(a:number,b:number):number{return b?gcd(b,a%b):a;}
export function dailyMatch(matches:Match[],date=gameDate()){
 const pool=matches.filter(isFeaturedFinal),eligible=pool.length?pool:matches;
 const ordered=[...eligible].sort((a,b)=>gameId(a).localeCompare(gameId(b)));
 let step=31;while(gcd(step,ordered.length)!==1)step+=2;
 const days=Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000);
 return ordered[((days*step)%ordered.length+ordered.length)%ordered.length];
}
const surfaceName=(surface:Match['surface'])=>({hard:'pista dura',clay:'tierra batida',grass:'hierba',carpet:'moqueta',unknown:'una superficie sin registrar'} as const)[surface];
export function challengeDifficulty(match:Match,referenceYear=Number(gameDate().slice(0,4))):GameDifficulty{
 const age=Math.max(0,referenceYear-match.year),grandSlam=/grand slam/i.test(match.category),final=/^final$/i.test(match.round);
 const score=(age>=18?1:0)+(age>=35?1:0)+(!grandSlam?1:0)+(!final?1:0);
 if(score>=3)return {key:'legendary',label:'Legendario',reason:'Archivo profundo y contexto poco evidente'};
 if(score>=1)return {key:'hard',label:'Difícil',reason:'Exige situar bien la época y el torneo'};
 return {key:'easy',label:'Fácil',reason:'Un gran escenario de la era reciente'};
}
export function clues(match:Match){
 const surface=surfaceName(match.surface);
 const winner=match.winner===1?match.player1.name:match.player2.name;
 const minutes=match.context?.minutes,sets=match.score_summary.games.length||match.final_score.trim().split(/\s+/).filter(Boolean).length;
 const duration=minutes?`Duró ${Math.floor(minutes/60)?`${Math.floor(minutes/60)} h `:''}${minutes%60} min y se resolvió en ${sets} ${sets===1?'set':'sets'}.`:match.context?.format?`Se disputó ${match.context.format.toLocaleLowerCase('es')} y se resolvió en ${sets} ${sets===1?'set':'sets'}.`:`Se resolvió en ${sets} ${sets===1?'set':'sets'}.`;
 return [
  `Fue un partido ${match.tour==='wta'?'WTA':'ATP'} sobre ${surface}.`,
  duration,
  `Fue una ${match.round.toLocaleLowerCase('es')} de ${match.category}.`,
  `Se jugó en ${tournamentName(match.tournament)} en ${match.year}.`,
  `Lo ganó ${winner}, con un marcador de ${match.final_score}.`,
 ];
}
export function comparativeFeedback(guess:Match,target:Match){
 const guessPlayers=[guess.player1.name,guess.player2.name],targetPlayers=[target.player1.name,target.player2.name],shared=guessPlayers.find(player=>targetPlayers.includes(player));
 const direction=target.year>guess.year?'más reciente':'más antiguo',distance=Math.abs(target.year-guess.year);
 if(shared)return `Buen rumbo: ${shared} también aparece en la respuesta. El partido buscado es ${direction}.`;
 if(normalize(guess.tournament)===normalize(target.tournament))return `El torneo coincide. Busca una edición ${direction}${distance?` por ${distance} ${distance===1?'año':'años'}`:''}.`;
 if(guess.surface===target.surface)return `La superficie coincide. El partido correcto es ${direction}.`;
 if(guess.year===target.year)return `El año es correcto, pero cambia el torneo y el cruce.`;
 if(guess.tour===target.tour)return `El circuito coincide. La respuesta está en ${surfaceName(target.surface)} y es ${direction}.`;
 return `Cambia de circuito y de superficie: la respuesta está en ${surfaceName(target.surface)}.`;
}
function resolvedGamePhoto(photo:NonNullable<ReturnType<typeof courtPhoto>>){
 const responsive=[...(photo.responsive||[])].sort((a,b)=>Math.abs(a.width-1068)-Math.abs(b.width-1068));
 const src=responsive[0]?.src||(/\.jpg$/i.test(photo.src)?photo.src.replace(/\.jpg$/i,'-1068.webp'):photo.src);
 return {src,credit:photo.credit,position:photo.objectPosition||'50% 50%',mobilePosition:photo.mobileObjectPosition||photo.objectPosition||'50% 50%'};
}
export function gameVisual(match:Match):GameVisual{
 const direct=courtPhoto(match.tournament)||courtPhoto(tournamentName(match.tournament));
 if(direct)return resolvedGamePhoto(direct);
 const fallbackName=match.surface==='clay'?'Roland Garros':match.surface==='grass'?'Wimbledon':match.surface==='carpet'?'ATP Finals':'Australian Open';
 const fallback=courtPhoto(fallbackName);
 if(!fallback)throw new Error(`No hay una imagen de pista disponible para ${fallbackName}.`);
 const visual=resolvedGamePhoto(fallback);
 return {...visual,credit:`Referencia visual de ${surfaceName(match.surface)} · ${visual.credit}`};
}
export function gameEditorial(match:Match):GameEditorial{
 const winner=winnerName(match)||'El ganador',loser=match.winner===1?match.player2.name:match.player1.name,story=matchStory(match),minutes=match.context?.minutes||null,score=scoreFor(match,winner);
 const headline=story?.headline||`${winner} se impuso a ${loser}.`;
 const summary=`${winner} venció a ${loser} en ${roundLabel(match.round).toLocaleLowerCase('es')} de ${tournamentName(match.tournament)} ${match.year}, con un marcador de ${score}.`;
 const decisive=decisiveMoments(match,1)[0]?.label||null;
 return {headline,summary,moment:decisive,winner,score,duration:minutes?durationLabel(minutes):null};
}
