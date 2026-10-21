import type { MetadataRoute } from 'next'
import { getMatches } from '@/lib/data'
export const revalidate = 3600
export async function generateSitemaps() { return Array.from({length:new Date().getUTCFullYear()-1967},(_,i)=>({id:1968+i})) }
export default async function sitemap({id}:{id:Promise<string>}): Promise<MetadataRoute.Sitemap> {
  const year=Number(await id)
  if (!Number.isInteger(year)||year<1968||year>new Date().getUTCFullYear()) return []
  return (await getMatches(year,undefined,true)).map(m=>({url:`https://deuce-archive.vercel.app/match/${m.match_id}`}))
}
