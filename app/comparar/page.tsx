import CompareExperience from './CompareExperience';
import {comparisonCanonical} from '@/lib/comparison-canonical';

const baseMetadata = {
  title: 'Comparador de jugadores — DEUCE',
  description: 'Compara dos jugadores del archivo DEUCE por trayectoria, rendimiento, superficie y enfrentamientos directos.',
  alternates: { canonical: '/comparar' },
  openGraph: {
    title: 'Comparador de jugadores — DEUCE',
    description: 'Trayectoria, superficies y cara a cara de dos jugadores en una lectura común.',
    url: '/comparar',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Comparador de jugadores — DEUCE',
    description: 'Trayectoria, superficies y cara a cara de dos jugadores en una lectura común.',
    images: ['/opengraph-image'],
  },
  robots: { index: false, follow: true },
};
export async function generateMetadata({searchParams}:{searchParams:Promise<Query>}) {
  const q=await searchParams, tour=q.tour==='wta'?'wta':'atp';
  const canonical=comparisonCanonical(q);
  const names=[q.a,q.b].filter(Boolean).map(name=>name!.slice(0,80));
  const title=names.length===2?`${names[0]} vs ${names[1]}: cara a cara y estadísticas — DEUCE`:tour==='wta'?'Comparar jugadoras WTA: estadísticas y cara a cara — DEUCE':'Comparar tenistas: estadísticas y cara a cara — DEUCE';
  const description=tour==='wta'
    ? 'Compara dos jugadoras WTA del archivo DEUCE por trayectoria, rendimiento, superficie y enfrentamientos directos.'
    : baseMetadata.description;
  return {...baseMetadata,title,description,alternates:{canonical},openGraph:{...baseMetadata.openGraph,title,description,url:canonical},twitter:{...baseMetadata.twitter,title,description}};
}
export const revalidate = 300;
type Query = Record<string, string | undefined>;

export default function Compare({searchParams}:{searchParams:Promise<Query>}){return <CompareExperience searchParams={searchParams}/>;}
