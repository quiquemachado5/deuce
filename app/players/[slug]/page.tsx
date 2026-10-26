import { permanentRedirect } from 'next/navigation';
export default async function LegacyPlayer({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const [{slug},query]=await Promise.all([params,searchParams]),values=new URLSearchParams();
  Object.entries(query).forEach(([key,value])=>{if(value)values.set(key,value);});
  permanentRedirect(`/jugadores/${slug}${values.size?`?${values}`:''}`);
}
