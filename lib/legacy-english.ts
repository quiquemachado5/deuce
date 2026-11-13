/** Keep entity IDs, slugs and filters when retiring the English archive. */
export function spanishArchiveUrl(input:URL):URL{
 const target=new URL(input), parts=input.pathname.split('/').filter(Boolean);
 const routes:Record<string,string>={matches:'partidos',players:'jugadores',tournaments:'torneos',records:'records',coverage:'cobertura',compare:'comparar','time-machine':'cobertura',developers:'desarrolladores'};
 const section=parts[1]||'';
 target.pathname=parts.length===1?'/':section==='matches'&&parts.length>2?'/match/'+parts.slice(2).join('/'):'/'+(routes[section]||parts.slice(1).join('/'))+(routes[section]&&parts.length>2?'/'+parts.slice(2).join('/'):'');
 if(section==='matches'&&parts.length===2&&!target.searchParams.has('tour'))target.searchParams.set('tour','all');
 if(section==='tournaments'){
  const tour=target.searchParams.get('tour');target.searchParams.delete('tour');
  if(tour==='atp'||tour==='wta')target.searchParams.set(parts.length>2?'cuadro':'circuito',tour);
 }
 if(section==='records'&&!target.searchParams.has('dato'))target.searchParams.set('dato','victorias');
 return target;
}
