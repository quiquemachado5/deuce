import {createHash,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import type {ExternalEvidence,ResearchProduct} from './contracts';

const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
/** Maps and sets are evidence, not empty JSON objects. Their insertion order is immaterial. */
export function canonicalResearchInput(value:unknown):string{
 if(value===undefined)return 'null';
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Non-finite research input');return JSON.stringify(value)}
 if(value instanceof Set)return JSON.stringify({set:[...value].map(canonicalResearchInput).sort()});
 if(value instanceof Map)return JSON.stringify({map:[...value].map(([k,v])=>[canonicalResearchInput(k),canonicalResearchInput(v)]).sort((a,b)=>a[0].localeCompare(b[0],'en'))});
 if(Array.isArray(value))return '['+value.map(canonicalResearchInput).join(',')+']';
 if(typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>JSON.stringify(k)+':'+canonicalResearchInput(v)).join(',')+'}';
 throw new Error('Unsupported research input');
}
export function researchDefinitionVersion(sources:Record<string,string>,evidence:ExternalEvidence):string{
 return digest(canonicalResearchInput({schema:2,sources,evidence})).slice(0,24);
}
/** Capture executable local imports and registries, including helpers used by eligibility rules. */
export async function researchSources(root:string,entries:string[]):Promise<Record<string,string>>{
 const sources:Record<string,string>={},visited=new Set<string>();
 const visit=async(file:string):Promise<void>=>{
  file=resolve(root,file);const name=relative(root,file).split(sep).join('/');
  if(name.startsWith('../')||name==='..')throw new Error('Research dependency escapes the repository');
  if(visited.has(file))return;visited.add(file);
  const content=await readFile(file,'utf8');sources[name]=digest(content);
  if(!/\.[cm]?[jt]sx?$/.test(file))return;
  const imports=[...content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g)].map(m=>m[1]);
  for(const id of imports){
   if(!id.startsWith('.')&&!id.startsWith('@/'))continue;
   const base=id.startsWith('@/')?resolve(root,id.slice(2)):resolve(dirname(file),id);
   let dependency:string|undefined;
   for(const path of [base,base+'.ts',base+'.tsx',base+'.mjs',base+'.json',join(base,'index.ts'),join(base,'index.tsx')]){
    try{await readFile(path);dependency=path;break}catch(error){if(!['ENOENT','EISDIR'].includes((error as NodeJS.ErrnoException).code||''))throw error}
   }
   if(!dependency)throw new Error('Missing research dependency: '+id+' in '+name);
   await visit(dependency);
  }
 };
 for(const entry of entries)await visit(entry);
 return sources;
}

/** Seal a generation before moving its pointer. Existing formula generations are never overwritten. */
export async function writeResearchGeneration(root:string,datasetVersion:string,definitionVersion:string,products:ResearchProduct[],report:Record<string,unknown>){
 if(!/^[a-f0-9]{20}$/.test(datasetVersion)||!/^[a-f0-9]{24}$/.test(definitionVersion))throw new Error('Invalid research generation identity');
 const parent=join(root,datasetVersion),destination=join(parent,definitionVersion);
 await mkdir(parent,{recursive:true});
 const encoded=JSON.stringify({schema:2,datasetVersion,definitionVersion,products}),productsSha256=digest(encoded);
 const temporary=await mkdtemp(join(parent,'.pending-'));
 let reused=false;
 try{
  await writeFile(join(temporary,'products.json.gz'),gzipSync(encoded));
  await writeFile(join(temporary,'report.json'),JSON.stringify({...report,schema:2,datasetVersion,definitionVersion,productsSha256},null,2)+'\n');
  try{await rename(temporary,destination)}catch(error){
   if(!['ENOTEMPTY','EEXIST'].includes((error as NodeJS.ErrnoException).code||''))throw error;
   const existing=gunzipSync(await readFile(join(destination,'products.json.gz')));
   if(digest(existing)!==productsSha256)throw new Error('Research generation is not reproducible; existing products preserved');
   reused=true;
  }
  const pointer=join(parent,'.latest-'+randomUUID()+'.tmp');
  try{
   await writeFile(pointer,JSON.stringify({schema:2,datasetVersion,definitionVersion,productsSha256})+'\n');
   await rename(pointer,join(parent,'latest.json'));
  }finally{await rm(pointer,{force:true})}
 }finally{await rm(temporary,{recursive:true,force:true})}
 return {directory:destination,productsSha256,reused};
}
