import { notebook } from "@/lib/cuaderno/data";
import { generationMetadata } from '@/lib/revista/generation';
import { pairSlug } from "@/lib/explore";
import { normalizeText } from "@/lib/quality";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    player = params.get("player")?.slice(0, 100).trim(),
    opponent = params.get("opponent")?.slice(0, 100).trim(),
    data = await notebook();

  if (player && opponent) {
    const firstKey = normalizeText(player);
    const secondKey = normalizeText(opponent);
    const matches = data.matches.filter((match) => {
      const names = [normalizeText(match.player1.name), normalizeText(match.player2.name)];
      return names.includes(firstKey) && names.includes(secondKey);
    });
    if (!matches.length) return Response.json({ pair: null, ...generationMetadata(data) });
    const names = [player, opponent].map((requested, index) => {
      const key = index === 0 ? firstKey : secondKey;
      return [matches[0].player1.name, matches[0].player2.name].find((name) => normalizeText(name) === key) || requested;
    }) as [string, string];
    const wins = names.map((name) => matches.filter((match) => {
      const winner = match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : "";
      return normalizeText(winner) === normalizeText(name);
    }).length) as [number, number];
    return Response.json(
      { pair: { names, wins, played: matches.length, slug: pairSlug(...names) }, ...generationMetadata(data) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600", "X-DEUCE-Dataset-Version": data.manifest.version } },
    );
  }
  const names = [
    ...new Set(
      data.pairs
        .filter((p) => !player || p.names.includes(player))
        .flatMap((p) => p.names)
        .filter((n) => n !== player),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
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
