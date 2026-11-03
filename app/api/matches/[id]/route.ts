import { preparedGeneration, preparedMatch } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [generation,match] = await Promise.all([preparedGeneration(),preparedMatch(id)])
  if (!match) return Response.json({ error: 'Partido no encontrado' }, { status: 404 })
  return Response.json({ match: { ...match, raw_fixture: undefined, raw_point_tape: undefined }, ...generationMetadata(generation) }, { headers: { 'X-DEUCE-Dataset-Version': generation.manifest.version, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
