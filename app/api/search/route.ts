import { searchArchive } from '@/lib/cuaderno/search'
export async function GET(request:Request){try{const q=new URL(request.url).searchParams.get('q')?.slice(0,180)||'';return Response.json({items:await searchArchive(q)},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}})}catch{return Response.json({error:'No se pudo abrir el archivo.'},{status:503})}}
