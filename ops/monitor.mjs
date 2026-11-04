import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { releaseFailures } from './release-policy.mjs';
import { recoveryFailures } from './recovery-policy.mjs';
import { monitorMarkdown, monitorReport } from './monitor-report.mjs';
const baseline = JSON.parse(await readFile(new URL('./release-baseline.json',import.meta.url),'utf8'));
const marker = '<!-- deuce-production-health-v1 -->';
const repository = 'quiquemachado5/deuce';
const productionUrl = String(process.env.DEUCE_MONITOR_URL || baseline.productionUrl).replace(/\/$/, '');
async function check() {
  const failures = [];
  try {
    const response = await fetch(productionUrl+'/api/health/deep',{signal:AbortSignal.timeout(30000),cache:'no-store'});
    if(!response.ok) return { health: null, failures: ['Health endpoint: HTTP '+response.status] };
    const h = await response.json();
    // The first validated seed can precede the provider's first scheduled
    // refresh. This exception is deliberately narrow: releaseFailures only
    // accepts a recent, explicitly marked seed while both refresh rows are
    // still absent. Errors, stale rows and every later failure remain fatal.
    failures.push(...releaseFailures(h,baseline,{allowInitialDailyUnavailable:true}));
    failures.push(...recoveryFailures(h));
    return { health: h, failures };
  } catch { failures.push('No se pudo consultar producción dentro del tiempo límite'); }
  return { health: null, failures };
}
let result = await check();
if (result.failures.length) { await new Promise(resolve => setTimeout(resolve,5000)); result = await check(); }
const { health, failures } = result;
const report = monitorReport(health, failures, productionUrl);
const reportArgument = process.argv.find(value => value.startsWith('--report='))?.slice(9);
if (reportArgument) await writeFile(reportArgument, JSON.stringify(report, null, 2)+'\n');
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, monitorMarkdown(report)+'\n');
console.log(failures.length ? 'DEUCE: '+failures.join('; ') : 'DEUCE: producción operativa; archivo, copia externa y restauración verificados');
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
  if(failures.length && !incident) await api('/issues','POST',{title:'[DEUCE] Incidencia de salud en producción',body:marker+'\n\n'+failures.map(f => '- '+f).join('\n')+'\n\nVerificar /api/health/deep, almacenamiento, scheduler, copia externa, simulacro de restauración, generación activa y logs del servidor. No publicar una generación con menor cobertura por circuito.\n\n'+productionUrl+'/cobertura'});
  else if(!failures.length && incident) {
    await api('/issues/'+incident.number+'/comments','POST',{body:'Recuperación verificada: producción operativa con archivo validado, volumen y catálogo por encima de la última release validada.'});
    await api('/issues/'+incident.number,'PATCH',{state:'closed',state_reason:'completed'});
  }
  if(failures.length) process.exitCode=1;
}
