import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import { generationMetadata } from '@/lib/revista/generation';
import { playerIdentity, rivalryPair } from "@/lib/explore";
import { preparedCompactSelection, preparedMatchBrowserIndex } from '@/lib/revista/read-records';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(request: Request) {
  const budget=rateLimit(request,'rivals',60,60_000);
  if(!budget.allowed)return Response.json({error:'Demasiadas consultas. Inténtalo de nuevo en un momento.'},{status:429,headers:{'Cache-Control':'private, no-store','Retry-After':String(budget.retryAfter)}});
  const params = new URL(request.url).searchParams,
    player = params.get("player")?.slice(0, 100).trim(),
    opponent = params.get("opponent")?.slice(0, 100).trim(),
    data = await preparedMatchBrowserIndex();

  const tour=params.get('tour')==='wta'?'wta':'atp';
  const circuitPlayers=data.index.circuits[tour].players.map(entry=>entry.name);
  const resolve=(name:string|undefined)=>name
    ? circuitPlayers.find(candidate=>playerIdentity(candidate,tour)===playerIdentity(name,tour))
    : undefined;
  const selectedPlayer=resolve(player),selectedOpponent=resolve(opponent);
  if (player && opponent) {
    const matches=selectedPlayer&&selectedOpponent
      ? await preparedCompactSelection({tour,players:[selectedPlayer,selectedOpponent]})
      : [];
    const pair = selectedPlayer&&selectedOpponent?rivalryPair(matches, [selectedPlayer, selectedOpponent], tour):null;
    return Response.json(
      { pair, ...generationMetadata(data) },
      { headers: { "Cache-Control": DATASET_CACHE_CONTROL, "X-DEUCE-Dataset-Version": data.manifest.version, "X-RateLimit-Remaining": String(budget.remaining) } },
    );
  }
  const matches=selectedPlayer?await preparedCompactSelection({tour,players:[selectedPlayer]}):[];
  const requestedIdentity=selectedPlayer?playerIdentity(selectedPlayer,tour):null;
  const names = selectedPlayer
    ? [...new Map(matches.flatMap(match=>[match.player1.name,match.player2.name])
      .filter(name=>playerIdentity(name,tour)!==requestedIdentity)
      .map(name=>[playerIdentity(name,tour),name])).values()].sort((a,b)=>a.localeCompare(b,'es'))
    : circuitPlayers.sort((a,b)=>a.localeCompare(b,'es'));
  return Response.json(
    { names, ...generationMetadata(data) },
    {
      headers: {
        "Cache-Control": DATASET_CACHE_CONTROL,
        "X-DEUCE-Dataset-Version": data.manifest.version,
        "X-RateLimit-Remaining": String(budget.remaining),
      },
    },
  );
}
