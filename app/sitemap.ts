import type { MetadataRoute } from 'next'
import { notebook } from '@/lib/cuaderno/data'
import { playerSlug } from '@/lib/explore'
import { recordCatalog } from '@/lib/revista/records'
import { tournamentDirectory } from '@/lib/tournament-directory'
export const revalidate=3600
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const data=await notebook(),events=tournamentDirectory(data.matches),editions=new Set(events.flatMap(t=>t.matches.map(m=>`/${t.slug}/${m.year}`)));return ['','/records','/jugadores','/buscar','/tournaments','/info','/credits','/cobertura','/historias',...recordCatalog(data.matches).map(s=>`/records?dato=${s.id}`),...events.map(t=>`/torneos/${t.slug}`),...data.players.map(p=>`/players/${playerSlug(p.name)}`),...data.pairs.map(p=>`/rivalries/${p.slug}`),...editions].map(path=>({url:`https://deuce-archive.vercel.app${path}`}))}
