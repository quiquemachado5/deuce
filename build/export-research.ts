import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {researchCsv,researchDataDictionary} from '../lib/research/export';
import {RESEARCH_RECIPES} from '../lib/research/recipes';
import type {ResearchProduct} from '../lib/research/contracts';
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
async function main(){
 const reading=JSON.parse(gunzipSync(await readFile('data/reading/manifest.json.gz')).toString());
 const parent=join('.deuce-cache/research',reading.version),pointer=JSON.parse(await readFile(join(parent,'latest.json'),'utf8'));
 if(!/^[a-f0-9]{24}$/.test(pointer.definitionVersion)||pointer.datasetVersion!==reading.version)throw new Error('Invalid research pointer');
 const generation=join(parent,pointer.definitionVersion),encoded=gunzipSync(await readFile(join(generation,'products.json.gz')));
 if(hash(encoded)!==pointer.productsSha256)throw new Error('Research integrity mismatch');
 const products=(JSON.parse(encoded.toString()) as {products:ResearchProduct[]}).products;
 const identities=new Set(products.map(product=>product.id+'|'+product.tour));
 if(products.length!==200||identities.size!==200||RESEARCH_RECIPES.some(recipe=>['atp','wta'].some(tour=>!identities.has(recipe.id+'|'+tour))))throw new Error('Incomplete research catalogue');
 if(products.some(product=>product.datasetVersion!==reading.version||product.definitionVersion!==pointer.definitionVersion))throw new Error('Mixed research generation');
 const output=join(generation,'exports'),temporary=await mkdtemp(output+'.pending-');
 try {
 const files=[];
 for(const product of products){
  const title=RESEARCH_RECIPES.find(recipe=>recipe.id===product.id)?.title;if(!title)throw new Error('Unknown metric');
  const name=`D${String(product.id).padStart(3,'0')}-${product.tour}.csv`,csv=researchCsv(product);await writeFile(join(temporary,name),csv);
  files.push({name,id:product.id,tour:product.tour,title,status:product.status,requiredEvidence:product.required,absoluteRecordEligible:product.absoluteRecordEligible,rows:product.status==='blocked'?0:product.rows.length,eligible:product.eligible,excluded:product.excluded,limitations:product.limitations,sha256:hash(csv)});
 }
 await writeFile(join(temporary,'dictionary.json'),JSON.stringify(researchDataDictionary,null,2)+'\n');
 await writeFile(join(temporary,'manifest.json'),JSON.stringify({schema:1,datasetVersion:reading.version,definitionVersion:pointer.definitionVersion,productsSha256:pointer.productsSha256,publicUiChanged:false,files},null,2)+'\n');
 try{await rename(temporary,output)}catch(error){if(!['EEXIST','ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code||''))throw error;const prior=await readFile(join(output,'manifest.json'));const next=await readFile(join(temporary,'manifest.json'));if(!prior.equals(next))throw new Error('Existing export differs; retained');for(const file of files)if(hash(await readFile(join(output,file.name)))!==file.sha256)throw new Error('Existing CSV integrity mismatch: '+file.name);await rm(temporary,{recursive:true,force:true})}
 console.log(JSON.stringify({output,files:files.length,calculated:files.filter(f=>f.status==='calculated-in-sample').length}));
 } finally {await rm(temporary,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Research export failed');process.exitCode=1});
