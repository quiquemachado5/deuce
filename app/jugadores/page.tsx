import {redirect} from 'next/navigation';
import {preparedGeneration} from '@/lib/revista/read-records';
import {robotsForUnavailableTour} from '@/lib/seo-metadata';
import PlayerDirectoryPage from '@/components/deuce/PlayerDirectoryPage';
export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const [query,generation]=await Promise.all([searchParams,preparedGeneration()]);
  const tour=query.tour==='wta'?'wta':'atp';
  const title=`${tour==='wta'?'Jugadoras':'Jugadores'} ${tour.toUpperCase()} — DEUCE`;
  const description=tour==='wta'&&generation.manifest.summary.tours.wta===0
    ? 'El directorio WTA de DEUCE está en preparación. Consulta mientras tanto los jugadores y partidos ATP publicados.'
    : `${tour==='wta'?'Jugadoras':'Jugadores'} ${tour.toUpperCase()} del archivo DEUCE, con temporadas, resultados y rendimiento documentados.`;
  const canonical=tour==='wta'?'/jugadores?tour=wta':'/jugadores';
  return {title,description,alternates:{canonical,},openGraph:{title,description,url:canonical},robots:robotsForUnavailableTour(generation.manifest.summary,tour)};
}

export default async function Players({searchParams}:{searchParams:Promise<{q?:string;page?:string;tour?:string;orden?:string;tipo?:string;filtros?:string}>}){
  const query=await searchParams;
  if(query.tipo==='enfrentamientos'||query.tipo==='parejas')redirect(query.tour==='wta'?'/comparar?tour=wta':'/comparar');
  return <PlayerDirectoryPage query={query}/>;
}
