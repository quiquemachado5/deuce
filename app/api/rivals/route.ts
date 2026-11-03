import { summaryNotebook } from "@/lib/cuaderno/data";
import { generationMetadata } from '@/lib/revista/generation';
import { playerIdentity, rivalryPair } from "@/lib/explore";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    player = params.get("player")?.slice(0, 100).trim(),
    opponent = params.get("opponent")?.slice(0, 100).trim(),
    data = await summaryNotebook();

  const tour=params.get('tour')==='wta'?'wta':'atp';
  if (player && opponent) {
    const pair = rivalryPair(data.matchesByTour[tour], [player, opponent], tour);
    return Response.json(
      { pair, ...generationMetadata(data) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600", "X-DEUCE-Dataset-Version": data.manifest.version } },
    );
  }
  const requestedIdentity=player?playerIdentity(player,tour):null;
  const namesByIdentity=new Map<string,string>();
  for(const pair of data.pairs) {
    if((pair.matches[0]?.tour||'atp')!==tour)continue;
    if(requestedIdentity&&!pair.names.some(name=>playerIdentity(name,tour)===requestedIdentity))continue;
    for(const name of pair.names) {
      const identity=playerIdentity(name,tour);
      if(identity!==requestedIdentity&&!namesByIdentity.has(identity))namesByIdentity.set(identity,name);
    }
  }
  const names = [...namesByIdentity.values()].sort((a, b) => a.localeCompare(b, "es"));
  return Response.json(
    { names, ...generationMetadata(data) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "X-DEUCE-Dataset-Version": data.manifest.version,
      },
    },
  );
}
