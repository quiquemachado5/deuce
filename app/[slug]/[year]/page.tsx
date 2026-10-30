import { notFound, permanentRedirect } from 'next/navigation';
export default async function LegacyEdition({params,searchParams}:{params:Promise<{slug:string;year:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const [{slug,year},query]=await Promise.all([params,searchParams]),values=new URLSearchParams();
  if(!/^\d{4}$/.test(year))notFound();
  Object.entries(query).forEach(([key,value])=>{if(value)values.set(key,value);});
  permanentRedirect(`/torneos/${slug}/${year}${values.size?`?${values}`:''}`);
}
