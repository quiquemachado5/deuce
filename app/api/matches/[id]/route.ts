import { getMatch } from '@/lib/data'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) return Response.json({ error: 'Partido no encontrado' }, { status: 404 })
  return Response.json({ match: { ...match, raw_fixture: undefined, raw_point_tape: undefined } })
}
