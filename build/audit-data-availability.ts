import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {auditAvailability} from '../lib/research/availability';
import type {Match} from '../lib/types';

async function main(){
 const base=join(process.cwd(),'data/reading');
 const decode=async(name:string)=>JSON.parse(gunzipSync(await readFile(join(base,name+'.json.gz'))).toString());
 const manifest=await decode('manifest'),matches:Match[]=await decode('matches');
 if(matches.length!==manifest.matchCount)throw new Error('Availability audit requires the complete publication');
 const report={datasetVersion:manifest.version,...auditAvailability(matches)};
 const output=join(process.cwd(),'.deuce-cache/research',manifest.version,'availability.json');await mkdir(join(output,'..'),{recursive:true});
 const body=JSON.stringify(report);const temporary=output+`.${process.pid}.tmp`;await writeFile(temporary,body);await rename(temporary,output);
 console.log(JSON.stringify({datasetVersion:manifest.version,output,sha256:createHash('sha256').update(body).digest('hex'),cohorts:report.cohorts.length,tours:report.cohorts.filter(c=>c.dimension==='tour')}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Availability audit failed');process.exitCode=1});
