import { spawn } from 'node:child_process'

const port = process.env.PORT || '3000'
const origin = `http://127.0.0.1:${port}`
const warmPaths = [
  '/',
  '/api/overview',
  '/api/search?mode=quick&tour=atp&q=Nadal',
  '/api/search?tour=atp&q=Nadal',
  '/api/search?mode=quick&tour=wta&q=Swiatek',
  '/api/search?tour=wta&q=Swiatek',
  '/partidos',
  '/records',
  '/jugadores',
  '/torneos',
  '/comparar',
  '/comparar?a=Roger+Federer&b=Rafael+Nadal',
  '/jugadores/rafael-nadal',
  '/records?dato=victorias&find=Nadal',
]

const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, HOSTNAME: '0.0.0.0', PORT: port },
  stdio: 'inherit',
})
const serverExit = new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal })))

let stopping = false
const stop = signal => {
  if (stopping) return
  stopping = true
  server.kill(signal)
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => stop('SIGTERM'))
process.on('SIGINT', () => stop('SIGINT'))

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error(`DEUCE server exited with ${server.exitCode}`)
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1_000))
  }
  throw new Error('DEUCE server did not become healthy in 90 seconds')
}

async function warmNavigation() {
  const rows = []
  for (const path of warmPaths) {
    const started = performance.now()
    try {
      const response = await fetch(origin + path, {
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
        headers: { 'User-Agent': 'DEUCE-Boot-Warmup/1.0' },
      })
      await response.arrayBuffer()
      rows.push({ path, status: response.status, ms: Math.round(performance.now() - started) })
    } catch {
      rows.push({ path, status: 0, ms: Math.round(performance.now() - started) })
    }
  }
  console.log(JSON.stringify({ event: 'deuce.navigation.warmed', rows }))
}

try {
  await waitForServer()
  await warmNavigation()
} catch (error) {
  console.error(JSON.stringify({ event: 'deuce.navigation.warmup.failed', error: error instanceof Error ? error.message : 'unknown' }))
}

const exit = await serverExit
if (!stopping && (exit.code ?? 1) !== 0) console.error(JSON.stringify({ event: 'deuce.server.failed', ...exit }))
process.exit(exit.code ?? (stopping ? 0 : 1))
