import { notFound } from "next/navigation";
import { courtPhoto } from "@/lib/imagery";
import { preparedTournamentSummaryArchive,preparedTournamentOverview } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import { categoryLabel, tournamentCategory, tournamentDirectory } from "@/lib/tournament-directory";
import { tournamentDetailPhoto } from "@/lib/tournament-detail-media";
import { singlesMatches } from "@/lib/match-discipline";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbJsonLd, tournamentSeriesJsonLd } from "@/lib/seo-metadata";
import { TournamentOverviewExperience } from "@/components/tournament/TournamentExperience";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ categoria?: string; cuadro?: string }> };

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria, cuadro } = await searchParams;
  const tournament = tournamentDirectory(await preparedTournamentSummaryArchive(slug)).find((entry) => entry.slug === slug);
  const singles=singlesMatches(tournament?.matches||[]);
  const requested=singles.filter(match=>match.category===categoria);
  const tour=cuadro==='wta'||(!cuadro&&requested.length>0&&requested.every(match=>match.tour==='wta'))||!singles.some(match=>(match.tour||'atp')==='atp')?'wta':'atp';
  const matches=singles.filter(match=>(match.tour||'atp')===tour);
  const categories=[...new Set(matches.map(match=>match.category))];
  const category=categoria&&categories.includes(categoria)?categoria:tournament&&matches.length?tournamentCategory({...tournament,matches,categories,latestYear:Math.max(...matches.map(match=>match.year))}):"";
  const canonicalParams=new URLSearchParams();
  if(categoria&&categories.includes(categoria))canonicalParams.set('categoria',categoria);
  if(cuadro==='wta')canonicalParams.set('cuadro','wta');
  const categoryQuery=canonicalParams.size?`?${canonicalParams}`:'';
  const title = `${tournament ? tournamentName(tournament.name) : "Torneo"}${category ? ` · ${categoryLabel(category)}` : ""} — DEUCE`;
  const description = "Títulos, finales y ediciones individuales masculinas y femeninas de este torneo en el archivo.";
  return {
    title,
    description,
    alternates: {
      canonical: `/torneos/${slug}${categoryQuery}`,

    },
    openGraph: { title, description, url: `/torneos/${slug}${categoryQuery}`, images: [`/torneos/${slug}/opengraph-image`] },
    twitter: { card: "summary_large_image", title, description, images: [`/torneos/${slug}/opengraph-image`] },
  };
}

export default async function Tournament({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categoria, cuadro } = await searchParams;
  const archive = await preparedTournamentSummaryArchive(slug);
  const tournament = tournamentDirectory(archive).find((entry) => entry.slug === slug);
  if (!tournament) notFound();
  const singles=singlesMatches(tournament.matches);
  const hasWomen=singles.some(match=>match.tour==='wta');
  const hasMen=singles.some(match=>(match.tour||'atp')==='atp');
  const singlesCategories=[...new Set(singles.map(match=>match.category))];
  const requestedCategory=categoria&&singlesCategories.includes(categoria)?categoria:undefined;
  const requestedRows=singles.filter(match=>match.category===requestedCategory);
  const selectedTour=cuadro==='wta'&&hasWomen?'wta':cuadro==='atp'&&hasMen?'atp':requestedRows.length&&requestedRows.every(match=>match.tour==='wta')?'wta':hasMen?'atp':'wta';
  const tourMatches=singles.filter(match=>(match.tour||'atp')===selectedTour);
  const tourCategories=[...new Set(tourMatches.map(match=>match.category))];
  const category=requestedCategory&&tourCategories.includes(requestedCategory)?requestedCategory:tournamentCategory({...tournament,matches:tourMatches,categories:tourCategories,latestYear:Math.max(...tourMatches.map(match=>match.year))});
  const registered=tourMatches.filter(match=>match.category===category);
  if (!registered.length) notFound();

  const titleName=tournamentName(tournament.name);
  const years=[...new Set(registered.map(match=>match.year))].sort((a,b)=>b-a);
  const photo=tournamentDetailPhoto(tournament.name)||courtPhoto(tournament.name)||null;
  return <><StructuredData value={[
    tournamentSeriesJsonLd({name:titleName,slug,category,tour:selectedTour,years,description:`Ediciones y resultados ${selectedTour.toUpperCase()} de ${titleName} en DEUCE.`}),
    breadcrumbJsonLd([{name:'Inicio',path:'/'},{name:'Torneos',path:`/torneos?circuito=${selectedTour}`},{name:titleName,path:`/torneos/${slug}?cuadro=${selectedTour}`}]),
  ]}/><TournamentOverviewExperience slug={slug} name={titleName} rawName={tournament.name} category={category} tour={selectedTour} matches={registered} allMatches={singles} photo={photo} overview={await preparedTournamentOverview(tournament.name,selectedTour,category)}/></>;
}
