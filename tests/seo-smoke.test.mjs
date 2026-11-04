import assert from 'node:assert/strict'
import test from 'node:test'
import { seoSmokeFailures } from '../ops/seo-smoke.mjs'

function fetcher(overrides = {}) {
  const responses = {
    '/robots.txt': () => new Response('User-Agent: *\nAllow: /\nSitemap: https://deuce.example/sitemap-index.xml\n', { headers: { 'Content-Type': 'text/plain' } }),
    '/sitemap-index.xml': () => new Response('<sitemapindex><sitemap><loc>https://deuce.example/sitemap.xml</loc></sitemap><sitemap><loc>https://deuce.example/match/sitemap/2026.xml</loc></sitemap></sitemapindex>', { headers: { 'Content-Type': 'application/xml' } }),
    '/manifest.webmanifest': () => Response.json({
      name: 'DEUCE', short_name: 'DEUCE', icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }, { headers: { 'Content-Type': 'application/manifest+json' } }),
    '/icon.svg': () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }),
    '/opengraph-image': () => new Response('png', { headers: { 'Content-Type': 'image/png' } }),
    ...overrides,
  }
  return async input => {
    const factory = responses[new URL(input).pathname]
    return factory ? factory() : new Response('Not found', { status: 404 })
  }
}

test('SEO smoke accepts the canonical discovery and social endpoints', async () => {
  assert.deepEqual(await seoSmokeFailures('https://deuce.example', fetcher()), [])
})

test('SEO smoke reports stale discovery files and an incomplete icon suite', async () => {
  const failures = await seoSmokeFailures('https://deuce.example', fetcher({
    '/robots.txt': () => new Response('Sitemap: https://deuce.example/sitemap.xml', { headers: { 'Content-Type': 'text/plain' } }),
    '/sitemap-index.xml': () => new Response('Not found', { status: 404 }),
    '/manifest.webmanifest': () => new Response(JSON.stringify({ name: 'DEUCE', short_name: 'DEUCE', icons: [] }), { headers: { 'Content-Type': 'text/html' } }),
    '/icon.svg': () => new Response('<svg/>', { headers: { 'Content-Type': 'text/html' } }),
  }))
  assert.ok(failures.includes('/robots.txt: índice de sitemaps ausente'))
  assert.ok(failures.includes('/sitemap-index.xml: HTTP 404'))
  assert.ok(failures.includes('/manifest.webmanifest: tipo de contenido inválido'))
  assert.ok(failures.includes('/manifest.webmanifest: identidad o iconos incompletos'))
  assert.ok(failures.includes('/icon.svg: tipo de contenido inválido'))
})
