import { readFile } from 'node:fs/promises';
const baseline = JSON.parse(await readFile(new URL('./release-baseline.json',import.meta.url),'utf8'));
const marker = '<!-- deuce-production-health-v1 -->';
const repository = 'quiquemachado5/deuce';
async function check() {
  const failures = [];
  try {
    const response = await fetch(baseline.productionUrl+'/api/health/deep',{signal:AbortSignal.timeout(30000),cache:'no-store'});
    if(!response.ok) return ['Health endpoint: HTTP '+response.status];
    const h = await response.json();
    if(h.status !== 'healthy') failures.push('Estado '+String(h.status).slice(0,30));
    if(!Number.isFinite(h.ageHours) || h.ageHours > 72) failures.push('Datos sin actualización comprobable en 72 horas');
    if(!Number.isSafeInteger(h.matches) || h.matches < baseline.minimumMatches) failures.push('Pérdida de volumen frente a la última release validada');
    if(!Number.isSafeInteger(h.statistics) || h.statistics < baseline.minimumStatistics) failures.push('Pérdida de catálogo frente a la última release validada');
    if(h.fallbackReason) failures.push('Respaldo activado por fallo de generación remota');
    if(!/^[a-f0-9]{20}$/.test(h.datasetVersion || '')) failures.push('Versión de datos ausente o inválida');
  } catch { failures.push('No se pudo consultar producción dentro del tiempo límite'); }
  return failures;
}
let failures = await check();
if (failures.length) { await new Promise(resolve => setTimeout(resolve,5000)); failures = await check(); }
console.log(failures.length ? 'DEUCE: '+failures.join('; ') : 'DEUCE: producción saludable; volumen y catálogo conservados');
if(process.argv.includes('--check-only')) { process.exitCode = failures.length ? 1:0; }
else {
  if(!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required for incident delivery');
  if(process.env.GITHUB_REPOSITORY !== repository) throw new Error('Unexpected repository');
  async function api(path,method='GET',body) {
    const response = await fetch('https://api.github.com/repos/'+repository+path,{method,signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body ? JSON.stringify(body):undefined});
    if(!response.ok) throw new Error('Incident API: HTTP '+response.status);
    return response.json();
  }
  // The issue is the durable deduplication key, even across workflow runners.
  let incident;
  for(let page=1;page<=10;page++) {
    const issues = await api('/issues?state=open&per_page=100&page='+page);
    incident = issues.find(issue => !issue.pull_request && issue.user?.login === 'github-actions[bot]' && issue.body?.includes(marker));
    if(incident || issues.length < 100) break;
    if(page===10) throw new Error('Issue pagination limit reached; refusing to create a possible duplicate');
  }
  if(failures.length && !incident) await api('/issues','POST',{title:'[DEUCE] Incidencia de salud en producción',body:marker+'\n\n'+failures.map(f => '- '+f).join('\n')+'\n\nVerificar /api/health/deep, capacidad de Supabase, ejecución de cron, generación activa y logs de Vercel. No publicar una generación con menor cobertura.\n\n'+baseline.productionUrl+'/cobertura'});
  else if(!failures.length && incident) {
    await api('/issues/'+incident.number+'/comments','POST',{body:'Recuperación verificada: endpoint saludable, volumen y catálogo por encima de la última release validada.'});
    await api('/issues/'+incident.number,'PATCH',{state:'closed',state_reason:'completed'});
  }
  if(failures.length) process.exitCode=1;
}
