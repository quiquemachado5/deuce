import Link from 'next/link';
import { notFound } from 'next/navigation';
import { preparedGeneration } from '@/lib/revista/read-records';
import { selectedArchive, selectedCatalog } from '@/lib/revista/selection';
import { recordEvidence, evidenceHref } from '@/lib/record-evidence';
import { number } from '@/lib/cuaderno/model';
import { recordValue } from '@/components/nocturno/RecordsViews';
import Row, { Pagination } from '@/components/nocturno/Row';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import { eraComparisons } from '@/lib/revista/records';
import { eligibleMatch } from '@/lib/quality';
import { chronological } from '@/lib/editorial';
export const metadata = { title: 'Los partidos detrás del dato — DEUCE', robots:{index:false,follow:true} };
export default async function Evidence({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const q = await searchParams, g = await preparedGeneration();
  if(q.dato === 'dos-epocas') {
    const matches=await g.matches(),cut=g.manifest.eraCuts.includes(Number(q.corte)) ? Number(q.corte):2020;
    const era=eraComparisons(matches,cut,q.nombre).find(e=>e.name===q.nombre);
    if(!era)notFound();
    const finals=matches.filter(m=>eligibleMatch(m)&&m.round.toLowerCase()==='final'&&(m.player1.name===era.name||m.player2.name===era.name)).sort(chronological);
    const page=Math.min(Math.max(1,Math.floor(Number(q.page))||1),Math.max(1,Math.ceil(finals.length/25)));
    return <div className="nc-wrap dx-evidence"><ArchiveNotice status={g}/><Link className="dx-inline-link" href={`/records?dato=dos-epocas&corte=${cut}`}>← Volver a la clasificación</Link>
      <header className="dx-page-heading"><p className="dx-eyebrow">DEL DATO AL PARTIDO</p><h1>{era.name}</h1><p>Todas las finales: antes de {cut} y desde {cut}.</p></header>
      <div className="dx-evidence-summary">{[era.before,era.after].map(period=><div key={period.from}><span>{period.from}–{period.to}</span><strong>{number(period.won/period.played*100,1)} %</strong><p>{number(period.won)} ganadas de {number(period.played)} finales.</p></div>)}</div>
      <aside className="dx-notice">Cada periodo tiene al menos cinco finales completas. La lista incluye victorias y derrotas, ordenadas por fecha y ronda, con el año visible en cada partido.</aside>
      <section className="dx-evidence-list" aria-label="Lista completa de evidencia">{finals.slice((page-1)*25,page*25).map(m=><Row key={m.match_id} match={m}/>)}</section>
      {finals.length>25&&<Pagination page={page} total={finals.length} href={p=>'/records/evidencia?'+new URLSearchParams({dato:'dos-epocas',nombre:era.name,corte:String(cut),page:String(p)})}/>}
      <p className="dx-provenance">{number(finals.length)} finales · Versión {g.manifest.version} · Reglas {g.manifest.rulesVersion}</p></div>;
  }
  if (!q.dato || !g.manifest.pieces.some(p => p.id === q.dato)) notFound();
  const catalog = await selectedCatalog(g,q,q.dato), piece = catalog.find(p => p.id === q.dato);
  const row = piece?.rows.find(r => r.name === q.nombre && r.detail === q.detalle && r.href === q.entrada);
  if (!row || !piece) notFound();
  const evidence = recordEvidence(await selectedArchive(g,q),piece.id,row);
  const page = Math.min(Math.max(1,Math.floor(Number(q.page))||1),Math.max(1,Math.ceil(evidence.matches.length/25)));
  const back = new URLSearchParams({dato:piece.id});
  for (const key of ['year','surface','competition']) if(q[key])back.set(key,q[key]!);
  return <div className="nc-wrap dx-evidence"><ArchiveNotice status={g} />
    <Link className="dx-inline-link" href={'/records?'+back}>← Volver a la clasificación</Link>
    <header className="dx-page-heading"><p className="dx-eyebrow">DEL DATO AL PARTIDO</p><h1>{row.name}</h1><p>{piece.title}</p></header>
    <div className="dx-evidence-summary"><div><span>Valor de la clasificación</span><strong>{recordValue(row,piece.percent,piece.id==='tal-dia-como-hoy')}</strong><p>{row.detail}</p></div><div><span>Partidos que lo sustentan</span><strong>{number(evidence.matches.length)}</strong><p>{piece.years} · selección completa y paginada</p></div></div>
    <aside className="dx-notice"><p>{piece.definition}</p><p>{evidence.note}</p></aside>
    <section aria-label="Lista completa de evidencia" className="dx-evidence-list">{evidence.matches.slice((page-1)*25,page*25).map(m => <Row key={m.match_id} match={m} />)}</section>
    {evidence.matches.length>25 && <Pagination page={page} total={evidence.matches.length} href={p => evidenceHref(piece.id,row,q)+'&page='+p} />}
    <p className="dx-provenance">Versión {g.manifest.version} · Reglas {g.manifest.rulesVersion} · <Link href="/cobertura">Cobertura y límites del archivo</Link></p>
  </div>;
}
