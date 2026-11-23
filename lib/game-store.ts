import 'server-only';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,readFileSync,chmodSync} from 'node:fs';
import path from 'node:path';

export type GameDayResult={guesses:string[];won:boolean;playedOn?:string;startedAt?:string;finishedAt?:string};
export type GamePlayer={name:string;key:string;ownerId?:string;ownerIds?:string[];recoveryHash?:string;days:Record<string,GameDayResult>;votes?:string[]};
export type GameStore={players:Record<string,GamePlayer>};
export type GameDuel={code:string;date:string;createdBy:string;createdAt:string};
export type GameDuelMember={code:string;ownerId:string;name:string;joinedAt:string};
export type GameStoreBackend='sqlite'|'supabase';
export type GameReadContext={
 player?:GamePlayer;
 totalPlayers:number;
 totalVoters:number;
 voteTotals:{matchId:string;count:number;points:number}[];
 daily:{played:number;won:number;attempts:number[]};
 performance:{position:number|null;total:number;topPercent:number|null};
};
const directory=process.env.DEUCE_GAME_STORE_DIR?.trim()||process.env.DEUCE_ARCHIVE_DIR?.trim()||path.join(process.cwd(),'.deuce-cache');
const databaseFile=path.join(directory,'daily-game.sqlite');
const legacyFile=path.join(process.cwd(),'.deuce-cache','daily-game.json');
let handle:DatabaseSync|undefined;
let queue:Promise<unknown>=Promise.resolve();
let cloudHandle:SupabaseClient|undefined;
export function cleanName(input:unknown){return typeof input==='string'?input.trim().replace(/\s+/g,' ').slice(0,40):'';}
export function nameKey(name:string){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');}
export function gameStoreBackend(env:Readonly<Record<string,string|undefined>>=process.env):GameStoreBackend{return env.DEUCE_GAME_STORE_BACKEND==='supabase'?'supabase':'sqlite';}
function cloud(){
 if(cloudHandle)return cloudHandle;
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw new Error('DEUCE_GAME_STORE_BACKEND=supabase requiere SUPABASE_URL y SUPABASE_SECRET_KEY.');
 cloudHandle=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 return cloudHandle;
}
function cloudError(scope:string,error:{code?:string;message?:string}|null){if(error)throw new Error(`${scope}: ${error.code||error.message||'error remoto'}`);}
const owns=(player:GamePlayer,ownerId:string)=>player.ownerId===ownerId||player.ownerIds?.includes(ownerId)===true;
const localPlayer=(store:GameStore,ownerId:string,name='')=>Object.values(store.players).find(player=>owns(player,ownerId))||(!store.players[nameKey(name)]?.ownerId?store.players[nameKey(name)]:undefined);
function localBind(player:GamePlayer,ownerId:string,name:string){player.name=name||player.name;player.ownerId=player.ownerId||ownerId;player.ownerIds=[...new Set([...(player.ownerIds||[]),player.ownerId,ownerId])];return player;}
function database(){
 if(handle)return handle;
 mkdirSync(directory,{recursive:true,mode:0o700});
 const db=new DatabaseSync(databaseFile);
 try{
  chmodSync(databaseFile,0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL; CREATE TABLE IF NOT EXISTS game_players (key TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT, days TEXT NOT NULL, votes TEXT, recovery_hash TEXT, sessions TEXT) WITHOUT ROWID; CREATE TABLE IF NOT EXISTS game_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID; CREATE TABLE IF NOT EXISTS game_days (date TEXT PRIMARY KEY, match_id TEXT NOT NULL) WITHOUT ROWID; CREATE TABLE IF NOT EXISTS game_duels (code TEXT PRIMARY KEY, date TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL) WITHOUT ROWID; CREATE TABLE IF NOT EXISTS game_duel_members (code TEXT NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(code,owner_id), FOREIGN KEY(code) REFERENCES game_duels(code) ON DELETE CASCADE) WITHOUT ROWID;');
  const columns=new Set((db.prepare('PRAGMA table_info(game_players)').all() as {name:string}[]).map(column=>column.name));
  if(!columns.has('recovery_hash'))db.exec('ALTER TABLE game_players ADD COLUMN recovery_hash TEXT');
  if(!columns.has('sessions'))db.exec('ALTER TABLE game_players ADD COLUMN sessions TEXT');
  if(existsSync(legacyFile)&&!db.prepare("SELECT value FROM game_meta WHERE key='legacy_imported'").get()){
   db.exec('BEGIN IMMEDIATE');
   try{
    const count=Number((db.prepare('SELECT COUNT(*) AS total FROM game_players').get() as {total:number}).total);
    if(count===0){
     const legacy=JSON.parse(readFileSync(legacyFile,'utf8')) as GameStore;
     const insert=db.prepare('INSERT INTO game_players(key,name,owner_id,days,votes) VALUES(?,?,?,?,?)');
     for(const player of Object.values(legacy.players))insert.run(player.key,player.name,player.ownerId||null,JSON.stringify(player.days),player.votes?JSON.stringify(player.votes):null);
    }
    db.prepare("INSERT OR IGNORE INTO game_meta(key,value) VALUES('legacy_imported','1')").run();
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
  }
  handle=db;
  return db;
 }catch(error){db.close();throw error;}
}
function load(db:DatabaseSync):GameStore{
 const players:GameStore['players']={};
 const rows=db.prepare('SELECT key,name,owner_id,days,votes,recovery_hash,sessions FROM game_players').all() as {key:string;name:string;owner_id:string|null;days:string;votes:string|null;recovery_hash:string|null;sessions:string|null}[];
 for(const row of rows)players[row.key]={key:row.key,name:row.name,...(row.owner_id?{ownerId:row.owner_id}:{}),...(row.sessions?{ownerIds:JSON.parse(row.sessions)}:{}),...(row.recovery_hash?{recoveryHash:row.recovery_hash}:{}),days:JSON.parse(row.days),...(row.votes?{votes:JSON.parse(row.votes)}:{})};
 return {players};
}
export async function readStore():Promise<GameStore>{return load(database());}
export async function ensureGameDays(proposals:{date:string;matchId:string}[]):Promise<Map<string,string>>{
 if(gameStoreBackend()==='supabase'){
  const client=cloud(),rows=proposals.map(proposal=>({date:proposal.date,match_id:proposal.matchId}));
  const written=await client.from('deuce_game_challenges').upsert(rows,{onConflict:'date',ignoreDuplicates:true});cloudError('No se pudieron fijar los retos diarios',written.error);
  const selected=await client.from('deuce_game_challenges').select('date,match_id').in('date',proposals.map(proposal=>proposal.date));cloudError('No se pudieron leer los retos diarios',selected.error);
  return new Map((selected.data||[]).map(row=>[String(row.date),String(row.match_id)]));
 }
 const db=database(),select=db.prepare('SELECT match_id FROM game_days WHERE date=?'),result=new Map<string,string>(),missing:{date:string;matchId:string}[]=[];
 for(const proposal of proposals){const row=select.get(proposal.date) as {match_id:string}|undefined;if(row)result.set(proposal.date,row.match_id);else missing.push(proposal);}
 if(!missing.length)return result;
 db.exec('BEGIN IMMEDIATE');
 try{
  const insert=db.prepare('INSERT OR IGNORE INTO game_days(date,match_id) VALUES(?,?)');
  for(const proposal of missing){insert.run(proposal.date,proposal.matchId);const row=select.get(proposal.date) as {match_id:string};result.set(proposal.date,row.match_id);}
  db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export async function dailyGameId(date:string,proposedId:string):Promise<string>{return (await ensureGameDays([{date,matchId:proposedId}])).get(date)||proposedId;}

export async function readGameContext(ownerId:string,name:string,date:string):Promise<GameReadContext>{
 if(gameStoreBackend()==='sqlite'){
  const store=await readStore(),player=localPlayer(store,ownerId,name),tally=new Map<string,{count:number;points:number}>();
  for(const candidate of Object.values(store.players))for(const [index,id] of (candidate.votes||[]).entries()){const value=tally.get(id)||{count:0,points:0};value.count++;value.points+=3-index;tally.set(id,value);}
  const dailyResults=Object.values(store.players).flatMap(candidate=>{const result=candidate.days[date];return result?.guesses.length?[{player:candidate,result}]:[];});
  const winners=dailyResults.filter(entry=>entry.result.won).sort((a,b)=>a.result.guesses.length-b.result.guesses.length||duration(a.result)-duration(b.result)||a.player.name.localeCompare(b.player.name,'es'));
  const position=player?winners.findIndex(entry=>entry.player.key===player.key)+1:0,attempts=Array.from({length:5},(_,index)=>winners.filter(entry=>entry.result.guesses.length===index+1).length);
  return {player,totalPlayers:Object.keys(store.players).length,totalVoters:Object.values(store.players).filter(candidate=>candidate.votes?.length===3).length,voteTotals:[...tally].map(([matchId,value])=>({matchId,...value})),daily:{played:dailyResults.length,won:winners.length,attempts},performance:{position:position||null,total:winners.length,topPercent:position?Math.max(1,Math.ceil(position/Math.max(1,winners.length)*100)):null}};
 }

 const client=cloud(),sessionResult=await client.from('deuce_game_sessions').select('profile_id').eq('owner_id',ownerId).maybeSingle();cloudError('No se pudo leer la sesión del juego',sessionResult.error);
 const profileId=sessionResult.data?.profile_id?String(sessionResult.data.profile_id):null;
 const [metricsResult,rankingResult,dailyResult,profileResult,playsResult,attemptsResult,votesResult,positionResult]=await Promise.all([
  client.from('deuce_game_metrics').select('profiles,voters').eq('singleton',true).maybeSingle(),
  client.from('deuce_game_vote_totals').select('match_id,voters,points').order('voters',{ascending:false}).order('points',{ascending:false}).order('match_id').limit(12),
  client.from('deuce_game_daily_totals').select('played,wins,attempt_1,attempt_2,attempt_3,attempt_4,attempt_5').eq('challenge_date',date).maybeSingle(),
  profileId?client.from('deuce_game_profiles').select('id,name,recovery_hash').eq('id',profileId).single():Promise.resolve({data:null,error:null}),
  profileId?client.from('deuce_game_plays').select('challenge_date,played_on,started_at,finished_at,won,attempts').eq('profile_id',profileId).order('challenge_date',{ascending:false}).limit(5000):Promise.resolve({data:[],error:null}),
  profileId?client.from('deuce_game_attempts').select('match_id').eq('profile_id',profileId).eq('challenge_date',date).order('attempt'):Promise.resolve({data:[],error:null}),
  profileId?client.from('deuce_game_votes').select('match_id').eq('profile_id',profileId).order('rank'):Promise.resolve({data:[],error:null}),
  profileId?client.rpc('deuce_game_position',{p_owner_id:ownerId,p_challenge_date:date}):Promise.resolve({data:{position:null,total:0},error:null}),
 ]);
 cloudError('No se pudieron leer las métricas',metricsResult.error);cloudError('No se pudo leer la clasificación de votos',rankingResult.error);cloudError('No se pudo leer el reto diario',dailyResult.error);cloudError('No se pudo leer el perfil',profileResult.error);cloudError('No se pudo leer el historial',playsResult.error);cloudError('No se pudieron leer los intentos',attemptsResult.error);cloudError('No se pudieron leer los votos',votesResult.error);cloudError('No se pudo calcular la posición',positionResult.error);
 const currentGuesses=(attemptsResult.data||[]).map(row=>String(row.match_id)),days:Record<string,GameDayResult>={};
 for(const row of playsResult.data||[]){const challengeDate=String(row.challenge_date),count=Number(row.attempts)||0;days[challengeDate]={guesses:challengeDate===date?currentGuesses:Array.from({length:count},(_,index)=>`history-${index}`),won:!!row.won,playedOn:String(row.played_on),startedAt:String(row.started_at),...(row.finished_at?{finishedAt:String(row.finished_at)}:{})};}
 const profile=profileResult.data,player=profile&&profileId?{key:profileId,name:String(profile.name),ownerId,days,votes:(votesResult.data||[]).map(row=>String(row.match_id)),...(profile.recovery_hash?{recoveryHash:String(profile.recovery_hash)}:{})}:undefined;
 const dailyRow=dailyResult.data,positionData=(positionResult.data||{}) as {position?:number|null;total?:number};const total=Number(positionData.total)||Number(dailyRow?.wins)||0,position=Number(positionData.position)||null;
 return {player,totalPlayers:Number(metricsResult.data?.profiles)||0,totalVoters:Number(metricsResult.data?.voters)||0,voteTotals:(rankingResult.data||[]).map(row=>({matchId:String(row.match_id),count:Number(row.voters),points:Number(row.points)})),daily:{played:Number(dailyRow?.played)||0,won:Number(dailyRow?.wins)||0,attempts:[1,2,3,4,5].map(index=>Number(dailyRow?.[`attempt_${index}` as keyof typeof dailyRow])||0)},performance:{position,total,topPercent:position?Math.max(1,Math.ceil(position/Math.max(1,total)*100)):null}};
}

const duration=(day:GameDayResult)=>day.startedAt&&day.finishedAt?Math.max(1,Math.round((Date.parse(day.finishedAt)-Date.parse(day.startedAt))/1000)):Number.MAX_SAFE_INTEGER;

export async function startGamePlayer(ownerId:string,name:string,date:string,playedOn:string,startedAt:string){
 if(gameStoreBackend()==='supabase'){const result=await cloud().rpc('deuce_game_start',{p_owner_id:ownerId,p_name:name,p_name_key:nameKey(name),p_challenge_date:date,p_played_on:playedOn});cloudError('No se pudo abrir el perfil',result.error);return;}
 await updateStore(store=>{const player=localBind(localPlayer(store,ownerId,name)||{name,key:ownerId,days:{}},ownerId,name);store.players[player.key]=player;if(date===playedOn&&!player.days[date])player.days[date]={guesses:[],won:false,playedOn,startedAt};return null;});
}

export async function submitGameGuess(ownerId:string,name:string,date:string,playedOn:string,startedAt:string,id:string,targetId:string){
 if(gameStoreBackend()==='supabase'){
  const result=await cloud().rpc('deuce_game_guess',{p_owner_id:ownerId,p_challenge_date:date,p_played_on:playedOn,p_match_id:id,p_target_id:targetId});cloudError('No se pudo guardar el intento',result.error);
  const status=String(result.data||'');return status==='finished'?'Ya has terminado este reto.':status==='duplicate'?'Ya probaste ese partido.':status==='profile_missing'?'Activa primero tu perfil.':null;
 }
 return updateStore(store=>{const player=localBind(localPlayer(store,ownerId,name)||{name,key:ownerId,days:{}},ownerId,name);store.players[player.key]=player;const day=player.days[date]||{guesses:[],won:false,playedOn,startedAt};player.days[date]=day;day.startedAt=day.startedAt||startedAt;if(day.won||day.guesses.length>=5)return 'Ya has terminado este reto.';if(day.guesses.includes(id))return 'Ya probaste ese partido.';day.guesses.push(id);day.won=id===targetId;if(day.won||day.guesses.length>=5)day.finishedAt=startedAt;return null;});
}

export async function submitGameVotes(ownerId:string,name:string,ids:string[]){
 if(gameStoreBackend()==='supabase'){const result=await cloud().rpc('deuce_game_vote',{p_owner_id:ownerId,p_match_ids:ids});cloudError('No se pudo guardar el podio',result.error);const status=String(result.data||'');return status==='already_voted'?'Ya has votado con este perfil.':status==='profile_missing'?'Activa primero tu perfil.':status==='invalid'?'Elige tres partidos distintos del archivo.':null;}
 return updateStore(store=>{const player=localBind(localPlayer(store,ownerId,name)||{name,key:ownerId,days:{}},ownerId,name);store.players[player.key]=player;if(player.votes)return 'Ya has votado con este perfil.';player.votes=ids;return null;});
}

export async function recoverGamePlayer(ownerId:string,recoveryHash:string){
 if(gameStoreBackend()==='supabase'){const result=await cloud().rpc('deuce_game_recover',{p_owner_id:ownerId,p_recovery_hash:recoveryHash});cloudError('No se pudo recuperar el perfil',result.error);return result.data?String(result.data):null;}
 return updateStore(store=>{const player=Object.values(store.players).find(candidate=>candidate.recoveryHash===recoveryHash);if(!player)return null;localBind(player,ownerId,player.name);return player.name;});
}

export async function resetGamePlayerDay(ownerId:string,name:string,date:string){
 if(gameStoreBackend()==='supabase')return;
 await updateStore(store=>{const player=localPlayer(store,ownerId,name);if(player)delete player.days[date];return null;});
}
export function updateStore<T>(change:(store:GameStore)=>T):Promise<T>{
 const action=queue.then(()=>{
  const db=database();db.exec('BEGIN IMMEDIATE');
  try{
   const store=load(db),before=new Map(Object.entries(store.players).map(([key,player])=>[key,JSON.stringify(player)]));
   const result=change(store);
   const upsert=db.prepare('INSERT INTO game_players(key,name,owner_id,days,votes,recovery_hash,sessions) VALUES(?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET name=excluded.name,owner_id=excluded.owner_id,days=excluded.days,votes=excluded.votes,recovery_hash=excluded.recovery_hash,sessions=excluded.sessions');
   const remove=db.prepare('DELETE FROM game_players WHERE key=?');
   for(const [key,player] of Object.entries(store.players))if(before.get(key)!==JSON.stringify(player))upsert.run(key,player.name,player.ownerId||null,JSON.stringify(player.days),player.votes?JSON.stringify(player.votes):null,player.recoveryHash||null,player.ownerIds?.length?JSON.stringify(player.ownerIds):null);
   for(const key of before.keys())if(!store.players[key])remove.run(key);
   db.exec('COMMIT');return result;
  }catch(error){db.exec('ROLLBACK');throw error;}
 });
 queue=action.catch(()=>{});
 return action;
}

export function createGameDuel(duel:GameDuel,member:GameDuelMember):Promise<boolean>{
 const action=queue.then(()=>{
  const db=database();db.exec('BEGIN IMMEDIATE');
  try{
   const inserted=db.prepare('INSERT OR IGNORE INTO game_duels(code,date,created_by,created_at) VALUES(?,?,?,?)').run(duel.code,duel.date,duel.createdBy,duel.createdAt).changes>0;
   if(inserted)db.prepare('INSERT INTO game_duel_members(code,owner_id,name,joined_at) VALUES(?,?,?,?)').run(member.code,member.ownerId,member.name,member.joinedAt);
   db.exec('COMMIT');return inserted;
  }catch(error){db.exec('ROLLBACK');throw error;}
 });
 queue=action.catch(()=>{});return action;
}
export function joinGameDuel(member:GameDuelMember):Promise<boolean>{
 const action=queue.then(()=>{
  const db=database();db.exec('BEGIN IMMEDIATE');
  try{
   const exists=!!db.prepare('SELECT 1 FROM game_duels WHERE code=?').get(member.code);
   if(exists)db.prepare('INSERT INTO game_duel_members(code,owner_id,name,joined_at) VALUES(?,?,?,?) ON CONFLICT(code,owner_id) DO UPDATE SET name=excluded.name').run(member.code,member.ownerId,member.name,member.joinedAt);
   db.exec('COMMIT');return exists;
  }catch(error){db.exec('ROLLBACK');throw error;}
 });
 queue=action.catch(()=>{});return action;
}
export async function readGameDuel(code:string):Promise<{duel:GameDuel;members:GameDuelMember[]}|null>{
 const db=database(),duel=db.prepare('SELECT code,date,created_by AS createdBy,created_at AS createdAt FROM game_duels WHERE code=?').get(code) as GameDuel|undefined;
 if(!duel)return null;
 const members=db.prepare('SELECT code,owner_id AS ownerId,name,joined_at AS joinedAt FROM game_duel_members WHERE code=? ORDER BY joined_at').all(code) as GameDuelMember[];
 return {duel,members};
}
