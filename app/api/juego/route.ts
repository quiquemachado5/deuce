import {createHash,randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {clues,comparativeFeedback,dailyMatch,gameCatalog,gameDate,gameEditorial,gameId,gameMatch,gameVisual} from '@/lib/daily-game';
import {cleanName,ensureGameDays,readGameContext,recoverGamePlayer,resetGamePlayerDay,startGamePlayer,submitGameGuess,submitGameVotes,type GamePlayer} from '@/lib/game-store';
import {rateLimit} from '@/lib/rate-limit';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const cookieName='deuce-game-visitor';
const archiveLength=14;
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
const isoDate=(date:Date)=>date.toISOString().slice(0,10);
const dateShift=(date:string,days:number)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return isoDate(value);};
const archiveDates=(today:string)=>Array.from({length:archiveLength},(_,index)=>dateShift(today,-index));
const normalizeCode=(code:unknown)=>String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const hashCode=(code:string)=>createHash('sha256').update(`deuce-game:${normalizeCode(code)}`).digest('hex');

function visitor(request:NextRequest){
 const stored=request.cookies.get(cookieName)?.value;
 return {id:stored&&/^[0-9a-f-]{36}$/i.test(stored)?stored:randomUUID(),fresh:!stored||!/^[0-9a-f-]{36}$/i.test(stored)};
}
function attachCookie<T>(response:NextResponse<T>,id:string,fresh:boolean){
 if(fresh)response.cookies.set(cookieName,id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*365*2});
 return response;
}
async function challenges(){
 const catalog=await gameCatalog(),today=gameDate(),dates=archiveDates(today);
 const proposals=dates.map(date=>({date,matchId:gameId(dailyMatch(catalog.matches,date))}));
 const ids=await ensureGameDays(proposals);
 return {catalog,today,dates,ids};
}
function personalStats(player:GamePlayer|undefined,totalPlayers:number,catalog:Awaited<ReturnType<typeof gameCatalog>>,ids:Map<string,string>,today:string){
 const entries=Object.entries(player?.days||{}).filter(([,day])=>day.guesses.length>0);
 const wins=entries.filter(([,day])=>day.won),averageAttempts=wins.length?wins.reduce((sum,[,day])=>sum+day.guesses.length,0)/wins.length:0;
 const live=new Map(entries.filter(([date,day])=>(day.playedOn||date)===date));
 const liveWins=[...live].filter(([,day])=>day.won).map(([date])=>date).sort();
 let bestStreak=0,run=0,previous='';
 for(const date of liveWins){run=previous&&dateShift(previous,1)===date?run+1:1;bestStreak=Math.max(bestStreak,run);previous=date;}
 let cursor=live.has(today)?today:dateShift(today,-1),currentStreak=0;
 while(live.get(cursor)?.won){currentStreak++;cursor=dateShift(cursor,-1);}
 const tournamentWins=new Map<string,number>();
 for(const [date] of wins){const match=catalog.byId.get(ids.get(date)||'');if(match)tournamentWins.set(match.tournament,(tournamentWins.get(match.tournament)||0)+1);}
 const favorite=[...tournamentWins].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return {played:entries.length,wins:wins.length,winRate:entries.length?Math.round(wins.length/entries.length*100):0,averageAttempts:Math.round(averageAttempts*10)/10,currentStreak,bestStreak,favoriteTournament:favorite?{name:favorite[0],wins:favorite[1]}:null,totalPlayers};
}

async function payload(name:string,ownerId:string,requestedDate?:string){
 const {catalog,today,dates,ids}=await challenges(),date=dates.includes(requestedDate||'')?requestedDate!:today,targetId=ids.get(date)||gameId(dailyMatch(catalog.matches,date)),target=catalog.byId.get(targetId)||dailyMatch(catalog.matches,date),context=await readGameContext(ownerId,name,date);
 const player=context.player,day=player?.days[date],finished=!!day&&(day.won||day.guesses.length>=5),byId=catalog.byId;
 const guesses=day?.guesses.flatMap(id=>{const match=byId.get(id);return match?[gameMatch(match)]:[]})||[];
 const comparisons=day?.guesses.flatMap(id=>{const match=byId.get(id);return match?[id===targetId?'Partido reconocido.':comparativeFeedback(match,target)]:[]})||[];
 return {
  date,today,isToday:date===today,name:player?.name||name,guesses,comparisons,feedback:comparisons.at(-1)||null,won:day?.won||false,finished,
  clues:clues(target).slice(0,Math.min(5,(day?.guesses.length||0)+1)),answer:finished?gameMatch(target):null,visual:gameVisual(target),editorial:finished?gameEditorial(target):null,
  votes:player?.votes||[],selectedVotes:(player?.votes||[]).flatMap(id=>{const match=byId.get(id);return match?[gameMatch(match)]:[]}),
  ranking:context.voteTotals.sort((a,b)=>b.count-a.count||b.points-a.points||a.matchId.localeCompare(b.matchId)).slice(0,12).flatMap(value=>{const match=byId.get(value.matchId);return match?[{...gameMatch(match),count:value.count,percent:context.totalVoters?Math.round(value.count/context.totalVoters*100):0}]:[]}),
  totalVoters:context.totalVoters,distribution:{played:context.daily.played,won:context.daily.won,solveRate:context.daily.played?Math.round(context.daily.won/context.daily.played*100):0,attempts:context.daily.attempts},performance:context.performance,
  stats:personalStats(player,context.totalPlayers,catalog,ids,today),
  archive:dates.map(itemDate=>{const item=player?.days[itemDate];return {date:itemDate,status:item?.won?'won':item&&item.guesses.length>=5?'lost':item?.guesses.length?'playing':'open'};}),
 };
}

export async function GET(request:NextRequest){
 const name=cleanName(request.nextUrl.searchParams.get('name')),{id,fresh}=visitor(request),requestedDate=request.nextUrl.searchParams.get('date')||undefined;
 return attachCookie(NextResponse.json(await payload(name,id,requestedDate),{headers:{'Cache-Control':'no-store'}}),id,fresh);
}

export async function POST(request:NextRequest){
 const budget=rateLimit(request,'daily-game-submit',40,60_000);if(!budget.allowed)return NextResponse.json({error:'Demasiadas acciones. Espera un momento.'},{status:429,headers:{'Retry-After':String(budget.retryAfter)}});
 let body:Record<string,unknown>;try{body=await request.json();}catch{return error('Solicitud inválida.');}
 const action=String(body.action||''),{id:ownerId,fresh}=visitor(request);
 if(action==='recover'){
  const code=normalizeCode(body.code);if(code.length!==12)return error('El código debe tener doce caracteres.');
  const recovered=await recoverGamePlayer(ownerId,hashCode(code));
  if(!recovered)return error('No encontramos ese código.',404);
  return attachCookie(NextResponse.json(await payload(recovered,ownerId),{headers:{'Cache-Control':'no-store'}}),ownerId,fresh);
 }
 const name=cleanName(body.name);if(name.length<2)return error('Escribe un nombre de al menos dos caracteres.');
 const {catalog,today,dates,ids}=await challenges(),date=String(body.date||today);if(!dates.includes(date))return error('Ese reto ya no está disponible.',409);
 const targetId=ids.get(date)||gameId(dailyMatch(catalog.matches,date)),target=catalog.byId.get(targetId)||dailyMatch(catalog.matches,date),now=new Date().toISOString();
 if(action==='start'){
  await startGamePlayer(ownerId,name,date,today,now);
 }else if(action==='guess'){
  const id=String(body.id||'');if(!catalog.byId.has(id))return error('Elige un partido del archivo.');
  const result=await submitGameGuess(ownerId,name,date,today,now,id,gameId(target));if(result)return error(result,409);
 }else if(action==='vote'){
  const votes=Array.isArray(body.ids)?body.ids.map(String):[];if(votes.length!==3||new Set(votes).size!==3||votes.some(id=>!catalog.byId.has(id)))return error('Elige tres partidos distintos del archivo.');
  const result=await submitGameVotes(ownerId,name,votes);if(result)return error(result,409);
 }else if(action==='reset'&&process.env.NODE_ENV!=='production'){
  await resetGamePlayerDay(ownerId,name,date);
 }else return error('Acción desconocida.');
 const response=await payload(name,ownerId,date);
 return attachCookie(NextResponse.json(response,{headers:{'Cache-Control':'no-store'}}),ownerId,fresh);
}
