import type { Match } from './types';

export type ProvenanceSource={label:string;href?:string;detail?:string};

function publicUrl(value:string|undefined){
  if(!value)return undefined;
  try{const url=new URL(value);return url.protocol==='https:'||url.protocol==='http:'?url.toString():undefined;}catch{return undefined;}
}

function hostLabel(href:string){
  try{return new URL(href).hostname.replace(/^www\./,'');}catch{return href;}
}

export function matchProvenance(match:Match,language:'es'|'en'='es'):ProvenanceSource[]{
  const english=language==='en',sources:ProvenanceSource[]=[];
  const fieldLabel=(field:string)=>english?({
    'Fecha de inicio del partido':'Match start date',
    'Fecha de finalización':'Match end date',
    'resultado':'Result',
    'Resultado':'Result',
  } as Record<string,string>)[field]||field:field;
  const result=publicUrl(match.context?.resultSource);
  if(result)sources.push({label:english?'Published result':'Resultado publicado',href:result,detail:hostLabel(result)});
  for(const source of match.context?.metadataSources||[]){
    const href=publicUrl(source.url);if(!href)continue;
    sources.push({label:source.field?fieldLabel(source.field):(english?'Verified context':'Contexto verificado'),href,detail:hostLabel(href)});
  }
  if(!sources.length)sources.push({
    label:match.data_source==='api'?(english?'Archived provider publication':'Publicación archivada del proveedor'):(english?'Independent archived reference':'Referencia independiente archivada'),
    detail:english?'Stored in the immutable DEUCE dataset':'Conservada en el dataset inmutable de DEUCE',
  });
  return sources.filter((source,index,all)=>all.findIndex(candidate=>candidate.href===source.href&&candidate.label===source.label)===index);
}
