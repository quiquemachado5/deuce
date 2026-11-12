import { notFound } from "next/navigation";
import { preparedTournamentEditionArchive, preparedTournamentEditionProduct, preparedTournamentSummaryArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import { categoryLabel, tournamentDirectory } from "@/lib/tournament-directory";
import { courtPhoto } from "@/lib/imagery";
import { tournamentDetailPhoto } from "@/lib/tournament-detail-media";
import { tournamentEditionCanonicalPath } from "@/lib/tournament-url";
import { TournamentEditionExperience } from "@/components/tournament/TournamentExperience";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ categoria?: string; cuadro?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedTournamentSummaryArchive(slug)).find(
    (entry) => entry.slug === slug,
  );
  const options =
    tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const men=options.filter(match=>(match.tour||'atp')==='atp');
  const women=options.filter(match=>match.tour==='wta');
  const requested=options.filter(match=>match.category===query.categoria);
  const selected=query.cuadro==='wta'&&women.length?women:query.cuadro==='atp'&&men.length?men:requested.length&&requested.every(match=>match.tour==='wta')?women:men.length?men:women;
  const level=query.categoria&&selected.some(match=>match.category===query.categoria)?query.categoria:selected[0]?.category;
  const selectedTour=selected===women&&women.length?'wta':'atp';
  const canonical=tournamentEditionCanonicalPath({slug,year:Number(year),matches:options,tour:selectedTour,category:level});
  const title = `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`;
  const description = `La final, el cuadro y los resultados ${selected === women ? 'femeninos' : 'masculinos'} de esta edición.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Edition({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  if (!/^\d{4}$/.test(year)) notFound();
  const summaryTournament = tournamentDirectory(await preparedTournamentSummaryArchive(slug)).find(
    (entry) => entry.slug === slug,
  );
  if (!summaryTournament) notFound();
  const summaryEdition = summaryTournament.matches.filter(
    (match) => match.year === Number(year),
  );
  const categories = [...new Set(summaryEdition.map((match) => match.category))];
  const men=summaryEdition.filter(match=>(match.tour||'atp')==='atp');
  const women=summaryEdition.filter(match=>match.tour==='wta');
  if (!men.length && !women.length) notFound();
  const requestedCategory=query.categoria&&categories.includes(query.categoria)?query.categoria:undefined;
  const requestedMatches=summaryEdition.filter(match=>match.category===requestedCategory);
  const selectedTour=query.cuadro==='wta'&&women.length?'wta':query.cuadro==='atp'&&men.length?'atp':requestedMatches.length&&requestedMatches.every(match=>match.tour==='wta')?'wta':men.length?'atp':'wta';
  const selectedSummary=selectedTour==='wta'?women:men;
  const category=requestedCategory&&selectedSummary.some(match=>match.category===requestedCategory)?requestedCategory:selectedSummary[0]?.category;
  const archive=await preparedTournamentEditionArchive(Number(year),selectedTour,summaryTournament.name);
  const tournament = tournamentDirectory(archive).find((entry) => entry.slug === slug);
  if (!tournament) notFound();
  const matches=tournament.matches.filter(match=>match.year===Number(year)&&match.category===category&&(match.tour||'atp')===selectedTour);
  const product=await preparedTournamentEditionProduct(Number(year),selectedTour,slug,category);
  return <TournamentEditionExperience slug={slug} name={tournamentName(tournament.name)} rawName={tournament.name} category={category} tour={selectedTour} year={Number(year)} matches={matches} allMatches={summaryTournament.matches} photo={tournamentDetailPhoto(tournament.name)||courtPhoto(tournament.name)||null} product={product}/>;
}
