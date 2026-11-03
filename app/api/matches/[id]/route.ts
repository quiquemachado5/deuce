import { preparedGeneration, preparedMatch } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
import { requestCacheScope, versionedJson } from '@/lib/http-cache'
import { rateLimit } from '@/lib/rate-limit'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const started=performance.now()
  const budget=rateLimit(request,'match-detail',120,60_000)
  if(!budget.allowed)return Response.json({error:'Demasiadas consultas. Inténtalo de nuevo en un momento.'},{status:429,headers:{'Cache-Control':'private, no-store','Retry-After':String(budget.retryAfter)}})
  const { id } = await params
  const [generation,match] = await Promise.all([preparedGeneration(),preparedMatch(id)])
  if (!match) return Response.json({ error: 'Partido no encontrado' }, { status: 404 })
  return versionedJson(request,{ match: { ...match, raw_fixture: undefined, raw_point_tape: undefined }, ...generationMetadata(generation) },{version:generation.manifest.version,scope:requestCacheScope(request,`match:${id}`),route:'match-detail',started,headers:{'X-RateLimit-Remaining':String(budget.remaining)}})
}
