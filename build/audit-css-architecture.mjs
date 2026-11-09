import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

// Ratchet the current audited stylesheet baseline. New declarations still fail CI,
// while the scheduled CSS consolidation can lower these limits incrementally.
const root=process.cwd(),directories=['app','components','styles'],limits={important:1350,rawColors:1050};
async function walk(directory){const rows=[];for(const entry of await readdir(directory,{withFileTypes:true}).catch(()=>[])){const path=join(directory,entry.name);if(entry.isDirectory())rows.push(...await walk(path));else if(path.endsWith('.css'))rows.push(path)}return rows}
const files=(await Promise.all(directories.map(directory=>walk(join(root,directory))))).flat();
let important=0,rawColors=0;
const offenders=[];
for(const file of files){const body=await readFile(file,'utf8'),fileImportant=(body.match(/!important/g)||[]).length,fileColors=(body.match(/#[0-9a-f]{3,8}\b/gi)||[]).length;important+=fileImportant;rawColors+=fileColors;if(fileImportant>25)offenders.push({file:relative(root,file),important:fileImportant,rawColors:fileColors})}
const failures=[];
if(important>limits.important)failures.push(`!important declarations regressed: ${important} > ${limits.important}`);
if(rawColors>limits.rawColors)failures.push(`Raw colour declarations regressed: ${rawColors} > ${limits.rawColors}`);
console.log(JSON.stringify({verified:!failures.length,files:files.length,important,rawColors,limits,largestImportant:offenders.sort((a,b)=>b.important-a.important).slice(0,10),failures},null,2));
if(failures.length)process.exitCode=1;
