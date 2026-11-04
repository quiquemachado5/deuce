import Link from 'next/link';
import { preparedCompactSelection, preparedGeneration } from '@/lib/revista/read-records';
import { archiveStories } from '@/lib/archive-stories';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import { toMatchRecord } from '@/data/map-match';
import { playerSlug } from '@/lib/explore';
import { tournamentDirectory } from '@/lib/tournament-directory';
import ArchiveFreshness from '@/components/ArchiveFreshness';
import { StructuredData } from '@/components/StructuredData';
import { breadcrumbJsonLd, itemListJsonLd, matchCanonicalPath } from '@/lib/seo-metadata';
export const revalidate=300;
export const metadata={
  title:'Historias del archivo · DEUCE',
  description:'Partidos históricos contados a través de sus resultados documentados, jugadores, ediciones y récords.',
  alternates:{canonical:'/historias'},
  openGraph:{title:'Historias del archivo · DEUCE',description:'Partidos históricos contados a través de sus resultados documentados, jugadores, ediciones y récords.',url:'/historias',images:['/opengraph-image']},
  twitter:{card:'summary_large_image' as const,title:'Historias del archivo · DEUCE',description:'Partidos históricos contados a través de sus resultados documentados, jugadores, ediciones y récords.',images:['/opengraph-image']},
};
export default async function Stories(){
  const generation=await preparedGeneration(),stories=archiveStories(await preparedCompactSelection({tour:'atp',players:['John Isner','Nicolas Mahut','Rafael Nadal','Roger Federer','Andy Murray']}));
  return <><StructuredData value={[
    breadcrumbJsonLd([{name:'Inicio',path:'/'},{name:'Historias',path:'/historias'}]),
    itemListJsonLd('Historias del archivo',stories.map(story=>({name:story.title,path:matchCanonicalPath(story.match.match_id)}))),
  ]}/><div className="deuce-content archive-stories"><header className="inner-title"><h1>Historias</h1></header><p>Una selección editorial basada en los resultados documentados. Cada historia lleva al partido y a sus datos.</p>
    {stories.map(story=>{const event=tournamentDirectory([story.match])[0];return <article id={story.id} key={story.id}><div><h2>{story.title}</h2><p>{story.text}</p><nav className="archive-suggestions" aria-label={`Explorar ${story.title}`}><Link href={`/jugadores/${playerSlug(story.match.player1.name)}`}>{story.match.player1.name}</Link><Link href={`/jugadores/${playerSlug(story.match.player2.name)}`}>{story.match.player2.name}</Link><Link href={`/torneos/${event.slug}/${story.match.year}`}>La edición</Link><Link href={`/records?dato=${story.record}`}>El récord</Link></nav></div><MatchScoreboard match={toMatchRecord(story.match)}/></article>;})}
    {!stories.length&&<p>Las historias aparecerán cuando estén disponibles sus partidos documentados.</p>}<ArchiveFreshness manifest={generation.manifest}/>
  </div></>;
}
