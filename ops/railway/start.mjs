import { spawn } from 'node:child_process'

const port = process.env.PORT || '3000'
const internalUrl = `http://127.0.0.1:${port}`

if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
if (!process.env.DEUCE_ARCHIVE_DIR) throw new Error('DEUCE_ARCHIVE_DIR is required')

const children = new Set()
let stopping = false

function launch(command, args, env = process.env) {
  const child = spawn(command, args, { env, stdio: 'inherit' })
  children.add(child)
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (!stopping && code !== 0) {
      console.error(JSON.stringify({ event: 'deuce.process.failed', command, code, signal }))
      shutdown('SIGTERM', 1)
    }
  })
  return child
}

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(`${internalUrl}/api/health`, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1_000))
  }
  throw new Error('DEUCE did not become healthy in 90 seconds')
}

function shutdown(signal, exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill(signal)
  setTimeout(() => process.exit(exitCode), 10_000).unref()
  if (children.size === 0) process.exit(exitCode)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

launch(process.execPath, ['server.js'], { ...process.env, HOSTNAME: '0.0.0.0', PORT: port })
await waitForServer()
console.log(JSON.stringify({ event: 'deuce.web.ready', port }))
launch(process.execPath, ['ops/oracle/scheduler.mjs'], { ...process.env, DEUCE_INTERNAL_URL: internalUrl })
