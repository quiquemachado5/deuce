import CompareExperience from '@/app/comparar/CompareExperience';
export const metadata={title:'Comparar · Propuesta — DEUCE',robots:{index:false,follow:false}};
export default function CompareProposal({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <CompareExperience searchParams={searchParams} basePath="/propuestas/comparar"/>}
