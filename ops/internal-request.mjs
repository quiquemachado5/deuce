import http from 'node:http'
import https from 'node:https'

// Publication can legitimately outlive fetch/Undici's five-minute header
// deadline. Keep an absolute deadline and a bounded body on internal requests.
export function internalRequest(url, { headers = {}, timeoutMs = 720_000, maximumBytes = 262_144 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    if (!['http:', 'https:'].includes(target.protocol)) return reject(new Error('Unsupported internal request protocol'))
    let timer
    const request = (target.protocol === 'https:' ? https : http).get(target, { headers }, response => {
      const chunks = []; let size = 0
      response.on('data', chunk => {
        size += chunk.length
        if (size > maximumBytes) response.destroy(new Error('Internal response exceeds limit'))
        else chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    timer = setTimeout(() => request.destroy(new Error('Internal request deadline exceeded')), timeoutMs)
    request.on('error', reject)
    request.on('close', () => clearTimeout(timer))
  })
}
