import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const base = 'https://api.livetennisapi.com/api/public/v1';
const document = 'https://docs.livetennisapi.com/openapi.json';
const classify = path => {
  if (/prices|markets/.test(path)) return 'Mercados: fuera del archivo deportivo';
  if (/webhooks|ws-token|usage|health|broadcast/.test(path)) return 'Operación y difusión';
  if (/incidents|withdrawals|status-history/.test(path)) return 'Calidad y correcciones';
  if (/charting|rally/.test(path)) return 'Golpes y rallies: cobertura selectiva';
  if (/rankings/.test(path)) return 'Ranking histórico y Elo';
  if (/stoppages|injuries/.test(path)) return 'Interrupciones y abandonos';
  if (/archive/.test(path)) return 'Archivo 1968–2022';
  if (/history/.test(path)) return 'Histórico moderno desde 2023';
  if (/players|h2h/.test(path)) return 'Jugadores y enfrentamientos';
  if (/tournaments/.test(path)) return 'Torneos';
  return 'Partidos, actividad y detalle';
};
async function json(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Consulta fallida: HTTP ${response.status}`);
  return response.json();
}
const spec = await json(document);
const endpoints = Object.entries(spec.paths).flatMap(([path, operations]) =>
  Object.entries(operations).filter(([method]) => ['get','post','put','patch','delete'].includes(method))
    .map(([method, operation]) => ({ path, method, family: classify(path), summary: operation.summary })));
const report = { documentation: document, version: spec.info.version, checkedAt: new Date().toISOString(), endpoints,
  authenticated: { status: 'not-configured' } };
// Read-only, opt-in authenticated audit: usage + coverage, never a bulk import.
// No API keys, player payloads or account identifiers appear in the report.
if (process.argv.includes('--live') && process.env.TENNIS_API_KEY) {
  const headers = { 'X-API-Key': process.env.TENNIS_API_KEY };
  try {
    const usage = await json(`${base}/usage`, headers);
    const remaining = Number(usage.today?.remaining_day);
    report.authenticated = { status: 'quota-reserve', remaining: Number.isFinite(remaining) ? remaining : null };
    if (remaining >= 120) {
      await new Promise(resolve => setTimeout(resolve, 1300));
      const coverage = await json(`${base}/history/coverage`, headers);
      report.authenticated = { status: 'verified', remaining, coverage };
    }
  } catch (error) {
    report.authenticated = { status: 'failed', error: error.message };
    process.exitCode = 1;
  }
} else if (!process.argv.includes('--live')) report.authenticated.status = 'not-requested';
console.log(JSON.stringify(report, null, 2));
