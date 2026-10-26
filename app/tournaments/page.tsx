import { permanentRedirect } from 'next/navigation';
export default async function LegacyTournaments({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const query=await searchParams,params=new URLSearchParams();
  Object.entries(query).forEach(([key,value])=>{if(value)params.set(key,value);});
  permanentRedirect(`/torneos${params.size?`?${params}`:''}`);
}
