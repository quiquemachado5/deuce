import Link from 'next/link';
import type { Match } from '@/lib/types';
import { matchProvenance, type ProvenanceSource } from '@/lib/provenance';
import styles from './entity-provenance.module.css';

type Props={match?:Match;sources?:ProvenanceSource[];basis?:string;version?:string;language?:'es'|'en'};

export default function EntityProvenance({match,sources,basis,version,language='es'}:Props){
  const english=language==='en',items=sources||(match?matchProvenance(match,language):[]);
  return <aside className={styles.root} aria-labelledby={`provenance-${language}`}>
    <div><span>{english?'TRACEABILITY':'TRAZABILIDAD'}</span><h2 id={`provenance-${language}`}>{english?'Sources and provenance':'Fuentes y procedencia'}</h2></div>
    <div className={styles.content}>{basis&&<p>{basis}</p>}{version&&<p>{english?'Dataset version':'Versión del dataset'} <code>{version}</code></p>}
      {items.length>0&&<ul>{items.map((source,index)=><li key={`${source.href||'stored'}-${source.label}-${index}`}>{source.href?<a href={source.href} target="_blank" rel="noopener noreferrer"><strong>{source.label}</strong><small>{source.detail}</small></a>:<span><strong>{source.label}</strong><small>{source.detail}</small></span>}</li>)}</ul>}
      <Link href={english?'/en/coverage':'/cobertura'}>{english?'How DEUCE documents the archive ↗':'Cómo documenta DEUCE el archivo ↗'}</Link>
    </div>
  </aside>;
}
