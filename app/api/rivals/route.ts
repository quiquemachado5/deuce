import { notebook } from "@/lib/cuaderno/data";
import { generationMetadata } from '@/lib/revista/generation';
export async function GET(request: Request) {
  const player = new URL(request.url).searchParams.get("player"),
    data = await notebook();
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
