import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root=process.cwd(),failures=[];
for(const file of ['netlify.toml','vercel.json','.vercel','.netlify']){
  try{await access(join(root,file));failures.push(`Forbidden hosting artifact: ${file}`);}catch{}
}
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const packageText=JSON.stringify({scripts:pkg.scripts,dependencies:pkg.dependencies,devDependencies:pkg.devDependencies}).toLowerCase();
for(const provider of ['netlify','vercel'])if(packageText.includes(provider))failures.push(`Forbidden ${provider} package or script in package.json`);
const workflows=await readdir(join(root,'.github','workflows')).catch(()=>[]);
for(const file of workflows){
  const body=(await readFile(join(root,'.github','workflows',file),'utf8')).toLowerCase();
  for(const provider of ['netlify','vercel'])if(body.includes(provider))failures.push(`Forbidden ${provider} deployment reference in .github/workflows/${file}`);
}
console.log(JSON.stringify({verified:failures.length===0,providers:['netcup','ghcr'],failures},null,2));
if(failures.length)process.exitCode=1;
