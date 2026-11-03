import { playerIdentity, playerSlug, type PlayerSummary } from './explore';
import { canonicalName } from './quality';
import type { PlayerRecord } from './season-analytics';
import type { Match, Tour } from './types';

/** Resolve spelling variants to the immutable record identity for one circuit. */
export function selectPlayerCareer(matches: readonly Match[],records: readonly PlayerRecord[],rawSlug:string,tour:Tour) {
  const requestedSlug=playerSlug(canonicalName(rawSlug.replace(/-/g,' ')));
  const record=records.find(entry=>(entry.tour||'atp')===tour&&playerSlug(entry.name)===requestedSlug);
  if(!record)return null;
  const recordNames=new Map<string,string>();
  for(const entry of records){
    if((entry.tour||'atp')!==tour)continue;
    const key=playerIdentity(entry.name,tour);
    if(!recordNames.has(key))recordNames.set(key,entry.name);
  }
  const identity=playerIdentity(record.name,tour);
  const player:PlayerSummary={name:record.name,tour,played:0,won:0,bySurface:{
    hard:{played:0,won:0},clay:{played:0,won:0},grass:{played:0,won:0},carpet:{played:0,won:0},unknown:{played:0,won:0},
  },matches:[]};
  for(const match of matches){
    if((match.tour||'atp')!==tour)continue;
    const first=playerIdentity(match.player1.name,tour),second=playerIdentity(match.player2.name,tour);
    const side=first===identity?1:second===identity?2:null;
    if(!side||!match.winner)continue;
    const normalized:Match={...match,
      player1:{...match.player1,name:recordNames.get(first)||match.player1.name},
      player2:{...match.player2,name:recordNames.get(second)||match.player2.name},
    };
    player.played++;
    player.won+=Number(match.winner===side);
    player.bySurface[match.surface].played++;
    player.bySurface[match.surface].won+=Number(match.winner===side);
    player.matches.push(normalized);
  }
  return player.matches.length?{player,record}:null;
}
