import type {Match} from '../types';
import {eligibleMatch} from '../quality';
import {chronological,roundPosition,winnerName} from '../editorial';
import {statNumber,matchStat} from '../archive-insights';
const statValue=(m:Match,side:1|2,name:string)=>statNumber(matchStat(m,side,name));
import {editionKey,personKey,countryObservationKey,eligibleFor,type Recipe,type ResearchRow,type ResearchCapability,type ExternalEvidence,type ResearchProduct} from './contracts';
type Side={m:Match;name:string;opponent:string;won:boolean;side:0|1;rank:number|null;opponentRank:number|null;age:number|null;opponentAge:number|null};
const sides=(matches:Match[]):Side[]=>matches.flatMap(m=>([0,1] as const).map(side=>({m,side,name:side?m.player2.name:m.player1.name,opponent:side?m.player1.name:m.player2.name,won:m.winner===side+1,rank:(side?m.context?.rank2:m.context?.rank1)??null,opponentRank:(side?m.context?.rank1:m.context?.rank2)??null,age:(side?m.context?.age2:m.context?.age1)??null,opponentAge:(side?m.context?.age1:m.context?.age2)??null})));
function group<T>(rows:T[],key:(row:T)=>string){const map=new Map<string,T[]>();for(const row of rows){const id=key(row);const set=map.get(id);if(set)set.push(row);else map.set(id,[row])}return map}
const row=(entity:string,value:number,rows:Match[],detail?:string):ResearchRow=>({entity,value,sample:rows.length,proof:rows.slice(0,5).map(m=>m.match_id),...(detail?{detail}:{})});
const sum=(numbers:number[])=>numbers.reduce((a,b)=>a+b,0);
const mean=(numbers:number[])=>numbers.length?sum(numbers)/numbers.length:0;
const median=(numbers:number[])=>{const sorted=[...numbers].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2};
const pct=(won:number,played:number)=>played?100*won/played:0;
const wins=(ss:Side[])=>ss.filter(s=>s.won).length;
const games=(m:Match,side:number)=>sum(m.score_summary.games.map(set=>set[side]));
const lostSets=(s:Side)=>s.m.score_summary.games.filter(set=>set[s.side]<set[1-s.side]).length;
const lostFirst=(s:Side)=>s.m.score_summary.games[0]?.[s.side]<s.m.score_summary.games[0]?.[1-s.side];
const final=(m:Match)=>roundPosition(m.round)===7;
const title=(s:Side)=>s.won&&final(s.m);
const day=(m:Match)=>Date.parse(m.context!.date!.slice(0,10)+'T12:00:00Z');
const days=(a:Match,b:Match)=>(day(b)-day(a))/86400000;
const tiebreaks=(m:Match)=>m.score_summary.games.filter(s=>Math.max(...s)===7&&Math.min(...s)===6).length;
const deciding=(m:Match)=>m.score_summary.games.length===(/5/.test(m.context?.format||'')?5:3);
const byPerson=(m:Match[])=>group(sides(m),s=>s.name);
const byEdition=(m:Match[])=>group(m,editionKey);
const sortedSides=(s:Side[])=>[...s].sort((a,b)=>chronological(a.m,b.m));
function playerAggregate(ms:Match[],key:(s:Side)=>string,value:(ss:Side[])=>number,minimum=1){return [...group(sides(ms),key)].filter(([,ss])=>ss.length>=minimum).map(([k,ss])=>row(k,value(ss),ss.map(s=>s.m)))}
const career=(m:Match[],value:(ss:Side[])=>number,min=1)=>playerAggregate(m,s=>s.name,value,min);
const season=(m:Match[],value:(ss:Side[])=>number,min=1)=>playerAggregate(m,s=>s.name+' · '+s.m.year,value,min);
function streak<T>(items:T[],accept:(item:T)=>boolean){let current=0,best=0;for(const item of items){current=accept(item)?current+1:0;best=Math.max(best,current)}return best}
function span(ss:Side[]){const sorted=sortedSides(ss);return sorted.length?days(sorted[0].m,sorted.at(-1)!.m):0}
function editionsPlayer(ms:Match[],measure:(ss:Side[])=>number){return playerAggregate(ms,s=>s.name+' · '+s.m.tournament+' · '+s.m.year,measure)}
const requireR:ResearchCapability[]=['results'];
const exact:ResearchCapability[]=['results','exact-date'];
const ranks:ResearchCapability[]=['results','ranking-at-match'];
const ages:ResearchCapability[]=['results','age-at-match'];
const measured:ResearchCapability[]=['results','measured-statistics'];
const points:ResearchCapability[]=['results','observed-points'];
const countries:ResearchCapability[]=['results','dated-country'];
const external:ResearchCapability[]=['results','event-registry'];
const recipes:Recipe[]=[];
const define=(id:number,title:string,required:ResearchCapability[],calculate:Recipe['calculate'])=>recipes.push({id,title,required,calculate});
// Every output is scoped to the selected circuit and immutable dataset. Unknowns are excluded, never zeroed.
define(1,'Victorias de Grand Slam por temporada',requireR,m=>season(m.filter(m=>m.category==='Grand Slam'),wins));
define(2,'Finales en las cuatro sedes de Grand Slam',requireR,m=>season(m.filter(m=>m.category==='Grand Slam'&&final(m)),s=>new Set(s.map(s=>s.m.tournament)).size).filter(r=>r.value===4));
define(3,'Semifinales en las cuatro sedes de Grand Slam',requireR,m=>season(m.filter(m=>m.category==='Grand Slam'&&roundPosition(m.round)===6),s=>new Set(s.map(s=>s.m.tournament)).size).filter(r=>r.value===4));
define(4,'Balance anual con mínimo 20 partidos',requireR,m=>season(m,s=>pct(wins(s),s.length),20));
define(5,'Mejora interanual de efectividad',requireR,m=>[...byPerson(m)].flatMap(([name,ss])=>{const seasons=[...group(ss,s=>String(s.m.year))].filter(([,s])=>s.length>=20).sort(([a],[b])=>Number(a)-Number(b));return seasons.slice(1).flatMap(([year,now],i)=>{const [before,old]=seasons[i];return Number(year)===Number(before)+1?[row(name+' · '+year,pct(wins(now),now.length)-pct(wins(old),old.length),[...old,...now].map(s=>s.m),'Diferencia en puntos porcentuales; mínimo 20 en ambos años')]:[]})}));
define(6,'Años consecutivos con título por nivel',requireR,m=>playerAggregate(m.filter(final),s=>s.name+' · '+s.m.category,ss=>{const years=[...new Set(ss.filter(title).map(s=>s.m.year))].sort((a,b)=>a-b);let run=0,best=0,previous=0;for(const year of years){run=year===previous+1?run+1:1;best=Math.max(best,run);previous=year}return best}));
define(7,'Victorias en cuatro décadas',requireR,m=>career(m,s=>new Set(s.filter(s=>s.won).map(s=>Math.floor(s.m.year/10))).size).filter(r=>r.value>=4));
define(8,'Distancia entre primera y última final',exact,m=>career(m.filter(final),span,2));
define(9,'Éxito en tres superficies durante una temporada',requireR,m=>season(m,s=>new Set(s.filter(title).map(s=>s.m.surface).filter(s=>s!=='unknown')).size).filter(r=>r.value>=3));
define(10,'Consistencia de cinco temporadas consecutivas',requireR,m=>[...byPerson(m)].flatMap(([name,ss])=>{const years=[...group(ss,s=>String(s.m.year))].sort(([a],[b])=>Number(a)-Number(b));return years.slice(4).flatMap(([year],i)=>{const window=years.slice(i,i+5);if(Number(year)-Number(window[0][0])!==4||window.some(([,s])=>s.length<20))return [];const rates=window.map(([,s])=>pct(wins(s),s.length)),avg=mean(rates);return [row(name+' · '+window[0][0]+'–'+year,Math.sqrt(mean(rates.map(r=>(r-avg)**2))),window.flatMap(([,s])=>s.map(x=>x.m)),'Desviación estándar de efectividad; menor = más consistente')]})}));
define(11,'Títulos por participación en una serie',requireR,m=>playerAggregate(m,s=>s.name+' · '+s.m.tournament,ss=>pct(ss.filter(title).length,new Set(ss.map(s=>s.m.year)).size)));
define(12,'Títulos consecutivos en una serie',requireR,m=>playerAggregate(m,s=>s.name+' · '+s.m.tournament,ss=>streak([...group(sortedSides(ss),s=>String(s.m.year))].map(([,s])=>s),s=>s.some(title))));
define(13,'Finales perdidas antes del primer título',exact,m=>career(m.filter(final),ss=>{const sorted=sortedSides(ss),i=sorted.findIndex(title);return i<0?0:i}));
define(14,'Ganadores de la última edición de torneos desaparecidos',external,(m,e)=>[...group(m,x=>x.tournament)].filter(([name])=>!e.currentEvents?.has(name)).flatMap(([name,ms])=>{const year=Math.max(...ms.map(m=>m.year));return ms.filter(x=>x.year===year&&final(x)).map(x=>row(winnerName(x)+' · '+name,year,[x]))}));
define(15,'Campeones antes y después de un cambio de sede',external,(m,e)=>playerAggregate(m.filter(final),s=>s.name+' · '+e.series!.get(s.m.tournament),ss=>new Set(ss.filter(title).map(s=>s.m.tournament)).size).filter(r=>r.value>1));
define(16,'Intervalo entre títulos de una serie',exact,m=>playerAggregate(m.filter(final),s=>s.name+' · '+s.m.tournament,ss=>{const ordered=sortedSides(ss.filter(title));return Math.max(0,...ordered.slice(1).map((s,i)=>days(ordered[i].m,s.m)))}));
define(17,'Título en la primera participación registrada',requireR,m=>playerAggregate(m,s=>s.name+' · '+s.m.tournament,ss=>{const first=Math.min(...ss.map(s=>s.m.year));return Number(ss.some(s=>s.m.year===first&&title(s)))}).filter(r=>r.value===1));
define(18,'Ronda alcanzada por participación',requireR,m=>editionsPlayer(m,ss=>Math.max(...ss.map(s=>roundPosition(s.m.round)+(title(s)?1:0)))));
define(19,'Campeones diferentes por torneo y década',requireR,m=>[...group(m.filter(final),m=>m.tournament+' · '+Math.floor(m.year/10)*10)].map(([k,ms])=>row(k,new Set(ms.map(winnerName)).size,ms)));
define(20,'Concentración de títulos en los tres mayores ganadores',requireR,m=>[...group(m.filter(final),m=>m.tournament)].map(([k,ms])=>row(k,pct([...group(ms,m=>winnerName(m)!)].map(([,r])=>r.length).sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0),ms.length),ms)));
define(21,'Títulos en superficies distintas en semanas consecutivas',exact,m=>career(m.filter(final),ss=>{const ordered=sortedSides(ss.filter(title));return ordered.slice(1).filter((s,i)=>s.m.surface!==ordered[i].m.surface&&days(ordered[i].m,s.m)>=5&&days(ordered[i].m,s.m)<=9).length}));
define(22,'Primer partido tras cambiar de superficie',exact,m=>career(m,ss=>{const sorted=sortedSides(ss),changed=sorted.slice(1).filter((s,i)=>s.m.surface!==sorted[i].m.surface);return pct(wins(changed),changed.length)}));
define(23,'Racha de victorias por superficie en el archivo',exact,m=>playerAggregate(m,s=>s.name+' · '+s.m.surface,ss=>streak(sortedSides(ss),s=>s.won)));
define(24,'Especialización con mínimo 20 partidos por superficie',requireR,m=>career(m,ss=>{const rates=[...group(ss.filter(s=>s.m.surface!=='unknown'),s=>s.m.surface)].filter(([,s])=>s.length>=20).map(([,s])=>pct(wins(s),s.length));return rates.length>=2?Math.max(...rates)-Math.min(...rates):0}));
define(25,'Títulos indoor y outdoor en una temporada',requireR,m=>season(m.filter(m=>final(m)&&m.surface==='hard'&&typeof m.context?.indoor==='boolean'),ss=>new Set(ss.filter(title).map(s=>s.m.context?.indoor)).size).filter(r=>r.value===2));
define(26,'Hierba antes y después de Wimbledon',[...exact,'event-window'],(m,e)=>playerAggregate(m.filter(m=>m.surface==='grass'&&e.eventWindows?.has('Wimbledon|'+m.year)),s=>s.name+' · '+s.m.year+' · '+(s.m.context!.date!.slice(0,10)<e.eventWindows!.get('Wimbledon|'+s.m.year)!.start?'antes':s.m.context!.date!.slice(0,10)>e.eventWindows!.get('Wimbledon|'+s.m.year)!.end?'después':'Wimbledon'),ss=>pct(wins(ss),ss.length)));
define(27,'Victoria tras derrota con margen de 10 juegos',exact,m=>career(m,ss=>{const sorted=sortedSides(ss);return sorted.slice(1).filter((s,i)=>s.won&&!sorted[i].won&&games(sorted[i].m,1-sorted[i].side)-games(sorted[i].m,sorted[i].side)>=10).length}));
define(28,'Sets decisivos por superficie y década',[...requireR,'known-match-format'],m=>[...group(m,m=>m.surface+' · '+Math.floor(m.year/10)*10)].map(([k,ms])=>row(k,pct(ms.filter(deciding).length,ms.length),ms)));
define(29,'Victoria con menos juegos por superficie',requireR,m=>playerAggregate(m,s=>s.name+' · '+s.m.surface,ss=>ss.filter(s=>s.won&&games(s.m,s.side)<games(s.m,1-s.side)).length));
define(30,'Cambio de tierra a hierba por días de descanso',exact,m=>[...byPerson(m)].flatMap(([name,ss])=>{const ordered=sortedSides(ss);return ordered.slice(1).flatMap((s,i)=>ordered[i].m.surface==='clay'&&s.m.surface==='grass'?[row(name+' · '+s.m.year,days(ordered[i].m,s.m),[ordered[i].m,s.m],s.won?'Victoria':'Derrota')]:[])}));
define(31,'Edad al ganar cada categoría',ages,m=>playerAggregate(m.filter(final),s=>s.name+' · '+s.m.category,ss=>Math.min(...ss.filter(title).map(s=>s.age!))).filter(r=>Number.isFinite(r.value)));
define(32,'Victorias ante top 10 antes de los 20', [...ages,'ranking-at-match'],m=>career(m,ss=>ss.filter(s=>s.won&&s.age!<20&&s.opponentRank!<=10).length));
define(33,'Años desde primera victoria hasta primer título',exact,m=>career(m,ss=>{const ordered=sortedSides(ss.filter(s=>s.won)),firstTitle=ordered.find(title);return firstTitle?days(ordered[0].m,firstTitle.m)/365.2425:0}));
define(34,'Títulos antes y después de los 30',ages,m=>playerAggregate(m.filter(final),s=>s.name+' · '+(s.age!<30?'antes de 30':'desde 30'),ss=>ss.filter(title).length));
define(35,'Duración entre primera y última victoria de Grand Slam',exact,m=>career(m.filter(m=>m.category==='Grand Slam'),ss=>span(ss.filter(s=>s.won)),2));
define(36,'Temporadas con finales después de los 35',ages,m=>career(m.filter(final),ss=>new Set(ss.filter(s=>s.age!>=35).map(s=>s.m.year)).size));
define(37,'Finales con mayor diferencia de edad',ages,m=>m.filter(final).map(m=>row(m.player1.name+' – '+m.player2.name,Math.abs(m.context!.age1!-m.context!.age2!),[m])));
define(38,'Rendimiento por edad observada',ages,m=>playerAggregate(m,s=>s.name+' · '+Math.floor(s.age!),ss=>pct(wins(ss),ss.length),10));
define(39,'Mismo torneo ganado adolescente y veterano',ages,m=>playerAggregate(m.filter(final),s=>s.name+' · '+s.m.tournament,ss=>Number(ss.some(s=>title(s)&&s.age!<20)&&ss.some(s=>title(s)&&s.age!>=30))).filter(r=>r.value===1));
define(40,'Edad media de finalistas por década',ages,m=>[...group(m.filter(final),m=>String(Math.floor(m.year/10)*10))].map(([k,ms])=>row(k,mean(ms.flatMap(m=>[m.context!.age1!,m.context!.age2!])),ms)));
define(41,'Victorias ante números uno por temporada',ranks,m=>season(m,ss=>ss.filter(s=>s.won&&s.opponentRank===1).length));
define(42,'Títulos derrotando a varios top 10',ranks,m=>editionsPlayer(m,ss=>ss.some(title)?ss.filter(s=>s.won&&s.opponentRank!<=10).length:0).filter(r=>r.value>=2));
define(43,'Ranking mediano de rivales del campeón',ranks,m=>editionsPlayer(m,ss=>ss.some(title)?median(ss.filter(s=>s.won).map(s=>s.opponentRank!)):0).filter(r=>r.value>0));
define(44,'Victorias fuera del top 100 ante top 10',ranks,m=>career(m,ss=>ss.filter(s=>s.won&&s.rank!>100&&s.opponentRank!<=10).length));
define(45,'Mayor diferencia de ranking en una final',ranks,m=>m.filter(final).map(m=>row(m.player1.name+' – '+m.player2.name,Math.abs(m.context!.rank1!-m.context!.rank2!),[m])));
define(46,'Efectividad ante top 5, 10 y 20',ranks,m=>[5,10,20].flatMap(cut=>career(m,ss=>{const selected=ss.filter(s=>s.opponentRank!<=cut);return selected.length>=10?pct(wins(selected),selected.length):0}).map(r=>({...r,entity:r.entity+' · top '+cut}))));
define(47,'Victorias frente a todos los miembros de un top 10 fechado',[...ranks,'exact-date'],(m,e)=>season(m,ss=>{const rosters=[...(e.topTen?.entries()||[])].filter(([key])=>key.startsWith((ss[0].m.tour||'atp')+'|'+ss[0].m.year));const beaten=new Set(ss.filter(s=>s.won).map(s=>s.opponent));return Number(rosters.some(([,names])=>names.length===10&&new Set(names).size===10&&names.every(name=>beaten.has(name))))}).filter(r=>r.value===1));
define(48,'Racha ante top 20 en la muestra fechada',[...ranks,'exact-date'],m=>career(m,ss=>streak(sortedSides(ss.filter(s=>s.opponentRank!<=20)),s=>s.won)));
define(49,'Elo medio por superficie con modelo fechado',['results','elo-model','exact-date'],(m,e)=>playerAggregate(m,s=>s.name+' · '+s.m.surface,ss=>mean(ss.map(s=>e.elo!.get(s.m.match_id+'|'+s.name)!))));
define(50,'Elo medio de rivales observados del campeón',['results','elo-model'],(m,e)=>editionsPlayer(m,ss=>ss.some(title)?mean(ss.filter(s=>s.won).map(s=>e.elo!.get(s.m.match_id+'|'+s.opponent)!)):0));
define(51,'Remontadas desde dos sets en contra',requireR,m=>career(m,ss=>ss.filter(s=>s.won&&s.m.score_summary.games.length===5&&s.m.score_summary.games.slice(0,2).every(set=>set[s.side]<set[1-s.side])).length));
define(52,'Remontadas del primer set por formato y ronda',requireR,m=>playerAggregate(m,s=>s.name+' · '+s.m.context?.format+' · '+s.m.round,ss=>ss.filter(s=>s.won&&lostFirst(s)).length));
define(53,'Victorias tras recibir un 0–6',requireR,m=>career(m,ss=>ss.filter(s=>s.won&&s.m.score_summary.games.some(set=>set[s.side]===0&&set[1-s.side]===6)).length));
define(54,'Victorias con diferencia negativa de juegos',requireR,m=>career(m,ss=>ss.filter(s=>s.won&&games(s.m,s.side)<games(s.m,1-s.side)).length));
define(55,'Finales con varios tie-breaks',requireR,m=>m.filter(m=>final(m)&&tiebreaks(m)>1).map(m=>row(m.tournament+' · '+m.year,tiebreaks(m),[m])));
define(56,'Campeones sin perder sets en edición certificada',['results','edition-census'],m=>editionsPlayer(m,ss=>Number(ss.some(title)&&sum(ss.map(lostSets))===0)).filter(r=>r.value===1));
define(57,'Campeones con todos sus partidos al set decisivo',['results','edition-census','known-match-format'],m=>editionsPlayer(m,ss=>Number(ss.some(title)&&ss.every(s=>deciding(s.m)))).filter(r=>r.value===1));
define(58,'Tie-breaks por torneo y formato',requireR,m=>[...group(m,m=>m.tournament+' · '+m.context?.format)].map(([k,ms])=>row(k,pct(sum(ms.map(tiebreaks)),sum(ms.map(m=>m.score_summary.games.length))),ms)));
define(59,'Racha de sets ganados en la muestra fechada',exact,m=>career(m,ss=>streak(sortedSides(ss).flatMap(s=>s.m.score_summary.games.map(set=>set[s.side]>set[1-s.side])),Boolean)));
define(60,'Margen medio de juegos en finales por década',requireR,m=>[...group(m.filter(final),m=>String(Math.floor(m.year/10)*10))].map(([k,ms])=>row(k,mean(ms.map(m=>Math.abs(games(m,0)-games(m,1)))),ms)));
function pairs(m:Match[]){return group(m,m=>[m.player1.name,m.player2.name].sort().join(' – '))}
define(61,'Balance de parejas por torneo y fecha',exact,m=>[...pairs(m)].flatMap(([k,ms])=>{const ordered=[...ms].sort(chronological),name=[ms[0].player1.name,ms[0].player2.name].sort()[0];let balance=0;return ordered.map(m=>{balance+=winnerName(m)===name?1:-1;return row(k+' · '+m.tournament+' · '+m.context!.date,balance,[m],'Ventaja acumulada del primer nombre')})}));
define(62,'Cambios de líder en una rivalidad',exact,m=>[...pairs(m)].map(([k,ms])=>{let balance=0,last=0,changes=0;const first=[ms[0].player1.name,ms[0].player2.name].sort()[0];for(const m of [...ms].sort(chronological)){balance+=winnerName(m)===first?1:-1;const sign=Math.sign(balance);if(sign&&last&&sign!==last)changes++;if(sign)last=sign}return row(k,changes,ms)}));
define(63,'Finales de una pareja en las tres superficies',requireR,m=>[...pairs(m.filter(final))].map(([k,ms])=>row(k,new Set(ms.map(m=>m.surface).filter(s=>['hard','clay','grass'].includes(s))).size,ms)).filter(r=>r.value===3));
define(64,'Rivales derrotados en las cuatro sedes de Grand Slam',requireR,m=>playerAggregate(m.filter(m=>m.category==='Grand Slam'),s=>s.name+' ante '+s.opponent,ss=>new Set(ss.filter(s=>s.won).map(s=>s.m.tournament)).size).filter(r=>r.value===4));
define(65,'Revancha tras perder la anterior final de una serie',exact,m=>playerAggregate(m.filter(final),s=>s.name+' · '+s.m.tournament,ss=>{const ordered=sortedSides(ss);return ordered.slice(1).filter((s,i)=>s.won&&!ordered[i].won&&s.opponent===ordered[i].opponent).length}));
define(66,'Victorias seguidas ante un mismo rival',exact,m=>playerAggregate(m,s=>s.name+' ante '+s.opponent,ss=>streak(sortedSides(ss),s=>s.won)));
define(67,'Balance opuesto en tierra y dura con mínimo 5 duelos',requireR,m=>[...pairs(m)].flatMap(([k,ms])=>{const first=[ms[0].player1.name,ms[0].player2.name].sort()[0],hard=ms.filter(m=>m.surface==='hard'),clay=ms.filter(m=>m.surface==='clay');if(hard.length<5||clay.length<5)return [];const h=pct(hard.filter(m=>winnerName(m)===first).length,hard.length),c=pct(clay.filter(m=>winnerName(m)===first).length,clay.length);return (h-50)*(c-50)<0?[row(k,Math.abs(h-c),ms)]:[]}));
define(68,'Duelos de la misma pareja en semanas consecutivas',exact,m=>[...pairs(m)].map(([k,ms])=>{const ordered=[...ms].sort(chronological);return row(k,ordered.slice(1).filter((m,i)=>days(ordered[i],m)>=5&&days(ordered[i],m)<=9).length,ms)}));
define(69,'Tiempo entre primer y último duelo',exact,m=>[...pairs(m)].filter(([,ms])=>ms.length>1).map(([k,ms])=>{const ordered=[...ms].sort(chronological);return row(k,days(ordered[0],ordered.at(-1)!),ms)}));
define(70,'Rendimiento frente a zurdos y diestros',[...requireR,'playing-hand'],(m,e)=>playerAggregate(m.filter(m=>e.hands?.has(personKey(m.tour||'atp',m.player1.name))&&e.hands.has(personKey(m.tour||'atp',m.player2.name))),s=>s.name+' · '+s.m.surface+' · rival '+e.hands!.get(personKey(s.m.tour||'atp',s.opponent)),ss=>pct(wins(ss),ss.length),10));
const country=(s:Side,e:ExternalEvidence)=>e.countries!.get(countryObservationKey(s.m,s.name))!;
define(71,'Primer campeón registrado de cada país y nivel',countries,(m,e)=>playerAggregate(m.filter(final),s=>country(s,e)+' · '+s.m.category,ss=>Math.min(...ss.filter(title).map(s=>s.m.year))).filter(r=>Number.isFinite(r.value)));
define(72,'Finales entre compatriotas por década',countries,(m,e)=>[...group(m.filter(m=>final(m)&&e.countries!.get(countryObservationKey(m,m.player1.name))===e.countries!.get(countryObservationKey(m,m.player2.name))),m=>String(Math.floor(m.year/10)*10))].map(([k,ms])=>row(k,ms.length,ms)));
define(73,'Países con finalistas en las cuatro sedes de Grand Slam',countries,(m,e)=>playerAggregate(m.filter(m=>m.category==='Grand Slam'&&final(m)),s=>country(s,e),ss=>new Set(ss.map(s=>s.m.tournament)).size).filter(r=>r.value===4));
define(74,'Diversidad de países en cuartos por edición',countries,(m,e)=>[...byEdition(m.filter(m=>roundPosition(m.round)===5))].map(([k,ms])=>row(k,new Set(sides(ms).map(s=>country(s,e))).size,ms)));
define(75,'Victorias entre generaciones de nacimiento',[...requireR,'birth-date'],(m,e)=>playerAggregate(m.filter(m=>e.birthdays?.has(personKey(m.tour||'atp',m.player1.name))&&e.birthdays.has(personKey(m.tour||'atp',m.player2.name))),s=>String(Math.floor(Number(e.birthdays!.get(personKey(s.m.tour||'atp',s.name))!.slice(0,4))/10)*10)+' ante '+Math.floor(Number(e.birthdays!.get(personKey(s.m.tour||'atp',s.opponent))!.slice(0,4))/10)*10,wins));
define(76,'Dominio por país y década',countries,(m,e)=>playerAggregate(m.filter(final),s=>country(s,e)+' · '+Math.floor(s.m.year/10)*10,ss=>ss.filter(title).length));
define(77,'Títulos locales y en el extranjero en una temporada',[...countries,'event-registry'],(m,e)=>season(m.filter(final),ss=>new Set(ss.filter(title).map(s=>country(s,e)===e.eventCountries?.get(s.m.tournament))).size).filter(r=>r.value===2));
define(78,'Campeones distintos por país y superficie',countries,(m,e)=>playerAggregate(m.filter(final),s=>country(s,e)+' · '+s.m.surface,ss=>new Set(ss.filter(title).map(s=>s.name)).size));
define(79,'Países campeones ATP y WTA en una misma semana',[...countries,'exact-date'],(m,e)=>playerAggregate(m.filter(final),s=>country(s,e)+' · semana '+Math.floor((day(s.m)+259200000)/604800000),ss=>ss.filter(title).length));
define(80,'Carreras con cambios de nacionalidad fechados',exact,(m,e)=>[...byPerson(m)].flatMap(([name,ss])=>{const history=e.countryHistory?.get(personKey(ss[0].m.tour||'atp',name));if(!history?.length)return [];const observed=ss.map(s=>{const date=s.m.context!.date!;return [...history].filter(h=>h.from<=date).sort((a,b)=>b.from.localeCompare(a.from))[0]?.country}).filter(Boolean);return [row(name,new Set(observed).size,ss.map(s=>s.m),'País fechado, sin sustituir retroactivamente nacionalidades')]}).filter(r=>r.value>1));
define(81,'Días entre semifinal y final',exact,m=>editionsPlayer(m,ss=>{const semi=ss.find(s=>roundPosition(s.m.round)===6),f=ss.find(s=>final(s.m));return semi&&f?days(semi.m,f.m):NaN}));
define(82,'Minutos acumulados antes de la final con cobertura completa',['results','edition-census'],m=>editionsPlayer(m,ss=>{const before=ss.filter(s=>!final(s.m));return ss.some(s=>final(s.m))&&before.length>0&&before.every(s=>Number.isInteger(s.m.context?.minutes)&&s.m.context!.minutes!>0&&s.m.context!.minutes!<=720)?sum(before.map(s=>s.m.context!.minutes!)):0}).filter(r=>r.value>0));
define(83,'Victoria al día siguiente de disputar cinco sets',exact,m=>career(m,ss=>{const ordered=sortedSides(ss);return ordered.slice(1).filter((s,i)=>s.won&&ordered[i].m.score_summary.games.length===5&&days(ordered[i].m,s.m)===1).length}));
define(84,'Jornadas con dos victorias individuales',exact,m=>playerAggregate(m,s=>s.name+' · '+s.m.context!.date!.slice(0,10),ss=>wins(ss)).filter(r=>r.value>=2));
define(85,'Semanas consecutivas con título',exact,m=>career(m.filter(final),ss=>{const ordered=sortedSides(ss.filter(title));let run=0,best=0;for(let i=0;i<ordered.length;i++){run=i&&days(ordered[i-1].m,ordered[i].m)>=5&&days(ordered[i-1].m,ordered[i].m)<=9?run+1:1;best=Math.max(best,run)}return best}));
define(86,'Títulos tras inactividad certificada',[...exact,'edition-census'],(m,e)=>sides(m.filter(final)).filter(title).flatMap(s=>{const since=e.inactiveSince?.get(s.name+'|'+s.m.context!.date!.slice(0,10));return since?[row(s.name,Math.max(0,(day(s.m)-Date.parse(since+'T12:00:00Z'))/86400000),[s.m],'Intervalo respaldado por calendario externo completo')]:[]}));
define(87,'Intervalo entre títulos en continentes distintos',exact,(m,e)=>[...byPerson(m.filter(final))].flatMap(([name,ss])=>{const ordered=sortedSides(ss.filter(title));return ordered.slice(1).flatMap((s,i)=>{const a=e.continents?.get(ordered[i].m.tournament),b=e.continents?.get(s.m.tournament);return a&&b&&a!==b?[row(name,days(ordered[i].m,s.m),[ordered[i].m,s.m],a+' → '+b)]:[]})}));
define(88,'Intervalo entre partidos registrados de torneos distintos',exact,m=>[...byPerson(m)].flatMap(([name,ss])=>{const ordered=sortedSides(ss);return ordered.slice(1).flatMap((s,i)=>s.m.tournament!==ordered[i].m.tournament?[row(name+' · '+s.m.year,days(ordered[i].m,s.m),[ordered[i].m,s.m])]:[])}));
define(89,'Juegos acumulados hasta ganar un título',['results','edition-census'],m=>editionsPlayer(m,ss=>ss.some(title)?sum(ss.map(s=>games(s.m,0)+games(s.m,1))):0).filter(r=>r.value>0));
define(90,'Aplazamientos con fecha prevista y real',exact,(m,e)=>m.flatMap(m=>{const planned=e.scheduledDates?.get(m.match_id);return planned&&planned!==m.context!.date!.slice(0,10)?[row(m.player1.name+' – '+m.player2.name,(day(m)-Date.parse(planned+'T12:00:00Z'))/86400000,[m],'Diferencia entre fecha prevista documentada y fecha real')]:[]}));
define(91,'Menor porcentaje de breaks concedidos en una edición',['results','edition-census'],m=>editionsPlayer(m,ss=>{const lost=ss.map(s=>statValue(s.m,s.side===0?2:1,'Break points converted')),served=ss.map(s=>statValue(s.m,(s.side+1) as 1|2,'Service games played'));return ss.some(title)&&lost.every(n=>n!==null)&&served.every(n=>n!==null)&&sum(served as number[])>0?pct(sum(lost as number[]),sum(served as number[])):NaN}));
define(92,'Victorias con menos puntos totales que el rival',measured,m=>career(m.filter(m=>statValue(m,1,'Total points won')!==null&&statValue(m,2,'Total points won')!==null),ss=>ss.filter(s=>s.won&&statValue(s.m,(s.side+1) as 1|2,'Total points won')!<statValue(s.m,s.side===0?2:1,'Total points won')!).length));
define(93,'Sets ganados sin afrontar bola de break',points,m=>career(m,ss=>sum(ss.map(s=>s.m.score_summary.games.filter((set,i)=>set[s.side]>set[1-s.side]&&!s.m.point_tape.some(p=>p.set===i+1&&p.server===s.side+1&&p.is_break_point===true)).length))));
define(94,'Victorias salvando puntos de partido observados',points,m=>career(m,ss=>ss.filter(s=>s.won&&s.m.point_tape.some(p=>p.is_match_point&&p.match_point_for===2-s.side&&p.winner===s.side+1)).length));
define(95,'Secuencias de breaks consecutivos',points,m=>career(m,ss=>Math.max(0,...ss.map(s=>streak(s.m.point_tape.filter(p=>p.game_ended&&p.server===2-s.side&&p.game!==13),p=>p.winner===s.side+1)))));
define(96,'Rendimiento al servir para cerrar un partido',points,m=>career(m,ss=>{let chances=0,closed=0;for(const s of ss){const tally=[0,0],sets=[0,0],target=/5/.test(s.m.context?.format||'')?3:2;for(const ps of group(s.m.point_tape,p=>p.set+'|'+p.game).values()){const end=ps.find(p=>p.game_ended);if(!end?.winner||!end.server)continue;const side=s.side,closing=end.server===side+1&&sets[side]===target-1&&tally[side]>=5&&tally[side]-tally[1-side]>=1;if(closing){chances++;if(end.winner===side+1)closed++}tally[end.winner-1]++;if(Math.max(...tally)>=6&&Math.abs(tally[0]-tally[1])>=2||Math.max(...tally)===7){sets[tally[0]>tally[1]?0:1]++;tally[0]=0;tally[1]=0}}}return pct(closed,chances)}));
define(97,'Tie-breaks remontados desde cinco puntos abajo',points,m=>career(m,ss=>sum(ss.map(s=>{const groups=group(s.m.point_tape.filter(p=>p.game===13&&p.score_before?.includes('-')),p=>p.set+'|'+p.game);let total=0;for(const ps of groups.values()){const set=s.m.score_summary.games[ps[0].set-1];if(!set||Math.max(...set)!==7||Math.min(...set)!==6||set[s.side]<set[1-s.side])continue;if(ps.some(p=>{const values=p.score_before!.split('-').map(Number);return values.every(Number.isFinite)&&values[1-s.side]-values[s.side]>=5}))total++}return total}))));
define(98,'Longitud observada de intercambios por superficie',points,m=>[...group(m,m=>m.surface)].map(([k,ms])=>{const lengths=ms.flatMap(m=>m.point_tape.map(p=>p.rally_length).filter((n):n is number=>n!==null&&Number.isFinite(n)));return row(k,mean(lengths),ms,'Solo puntos con longitud observada; no imputación')}).filter(r=>r.value>0));
define(99,'Ventaja del sacador por régimen reglamentario',[...points,'regulation-registry'],(m,e)=>[...group(m,m=>e.regulations!.get(editionKey(m))!)].map(([k,ms])=>{const ps=ms.flatMap(m=>m.point_tape).filter(p=>p.server&&p.winner);return row(k,pct(ps.filter(p=>p.server===p.winner).length,ps.length),ms)}));
define(100,'Registro de hitos certificados',['results','verified-events'],(m,e)=>e.verifiedEvents!.filter(event=>event.tour===(m[0].tour||'atp')).map(event=>({entity:event.entity,value:event.value,detail:event.detail,sample:event.proof.length,proof:event.proof})));
export const RESEARCH_RECIPES:readonly Recipe[]=recipes;
function externalReady(id:number,e:ExternalEvidence){switch(id){case 26:return !!e.eventWindows?.size;case 75:return !!e.birthdays?.size;case 14:return !!e.currentEvents;case 77:return !!e.eventCountries?.size;case 47:return !!e.topTen?.size;case 70:return !!e.hands?.size;case 79:return !!e.countries?.size;case 80:return !!e.countryHistory?.size;case 86:return !!e.inactiveSince?.size;case 87:return !!e.continents?.size;case 90:return !!e.scheduledDates?.size;default:return true}}
export function calculateResearchProducts(matches:Match[],datasetVersion:string,evidence:ExternalEvidence={},definitionVersion='research-v2'):ResearchProduct[]{
 if(!/^[a-f0-9]{20}$/.test(datasetVersion))throw new Error('Research requires an immutable dataset version');
 const approved=matches.filter(eligibleMatch),output:ResearchProduct[]=[];
 for(const tour of ['atp','wta'] as const){const circuit=approved.filter(m=>(m.tour||'atp')===tour);
  for(const recipe of RESEARCH_RECIPES){
   // A complete-edition claim must inspect every result in that edition.
   // Filtering missing statistics/dates first would fabricate a complete path.
   const completeContract=recipe.required.includes('edition-census');
   const incompleteInputs=completeContract?new Set(circuit.filter(m=>!recipe.required.every(cap=>eligibleFor(m,cap,evidence))).map(editionKey)):new Set<string>();
   const eligible=circuit.filter(m=>!incompleteInputs.has(editionKey(m))&&recipe.required.every(cap=>eligibleFor(m,cap,evidence)));
   const blocked=!externalReady(recipe.id,evidence)||!eligible.length;
   const ascending=[10,31,71,91].includes(recipe.id);
   const results=blocked?[]:(recipe.id===79?sharedTitleWeeks(approved,tour,evidence):recipe.calculate(eligible,evidence)).filter(r=>Number.isFinite(r.value)&&r.sample>0).sort((a,b)=>(ascending?a.value-b.value:b.value-a.value)||a.entity.localeCompare(b.entity,'es'));
   output.push({id:recipe.id,tour,definitionVersion,datasetVersion,status:blocked?'blocked':'calculated-in-sample',required:recipe.required,eligible:eligible.length,excluded:circuit.length-eligible.length,absoluteRecordEligible:false,limitations:['Resultado del archivo seleccionado; no acredita un récord mundial.','La ausencia de un resultado no demuestra ausencia de participación.',...(blocked?['Falta evidencia o un contrato externo específico; no se publica una cifra.']:[])],rows:results.slice(0,100)});
  }
 }
 return output;
}

function sharedTitleWeeks(matches:Match[],tour:'atp'|'wta',e:ExternalEvidence):ResearchRow[]{
 const winners=sides(matches.filter(m=>final(m)&&eligibleFor(m,'exact-date',e)&&eligibleFor(m,'dated-country',e))).filter(title);
 return [...group(winners,s=>country(s,e)+'|'+Math.floor((day(s.m)+259200000)/604800000))].filter(([,ss])=>new Set(ss.map(s=>s.m.tour||'atp')).size===2).map(([name,ss])=>row(name,ss.filter(s=>(s.m.tour||'atp')===tour).length,ss.filter(s=>(s.m.tour||'atp')===tour).map(s=>s.m),'Semana con títulos en ambos circuitos; el valor cuenta solo '+tour.toUpperCase()));
}
