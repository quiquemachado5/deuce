const timeoutMs = 15_000

async function response(productionUrl, path, fetcher) {
  try {
    const result = await fetcher(`${productionUrl}${path}`, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!result.ok) return { failure: `${path}: HTTP ${result.status}` }
    return { result }
  } catch {
    return { failure: `${path}: no disponible` }
  }
}

function contentType(result) {
  return result.headers.get('content-type')?.toLowerCase() || ''
}

export async function seoSmokeFailures(productionUrl, fetcher = fetch) {
  const failures = []

  const robots = await response(productionUrl, '/robots.txt', fetcher)
  if (robots.failure) failures.push(robots.failure)
  else {
    const body = await robots.result.text()
    if (!contentType(robots.result).includes('text/plain')) failures.push('/robots.txt: tipo de contenido inválido')
    if (!/^Sitemap:\s+https?:\/\/[^\s]+\/sitemap-index\.xml$/mi.test(body)) failures.push('/robots.txt: índice de sitemaps ausente')
  }

  const sitemap = await response(productionUrl, '/sitemap-index.xml', fetcher)
  if (sitemap.failure) failures.push(sitemap.failure)
  else {
    const body = await sitemap.result.text()
    if (!contentType(sitemap.result).includes('xml')) failures.push('/sitemap-index.xml: tipo de contenido inválido')
    if (!body.includes('<sitemapindex') || !body.includes('/sitemap.xml') || !body.includes('/match/sitemap/')) {
      failures.push('/sitemap-index.xml: contenido incompleto')
    }
  }

  const manifest = await response(productionUrl, '/manifest.webmanifest', fetcher)
  if (manifest.failure) failures.push(manifest.failure)
  else {
    if (!contentType(manifest.result).includes('json')) failures.push('/manifest.webmanifest: tipo de contenido inválido')
    try {
      const body = await manifest.result.json()
      const icons = Array.isArray(body?.icons) ? body.icons : []
      const png = size => icons.some(icon => icon?.type === 'image/png' && String(icon.sizes || '').split(/\s+/).includes(size))
      const maskable = icons.some(icon => icon?.type === 'image/png' && String(icon.purpose || '').split(/\s+/).includes('maskable'))
      if (!body?.name || !body?.short_name || !png('192x192') || !png('512x512') || !maskable) {
        failures.push('/manifest.webmanifest: identidad o iconos incompletos')
      }
    } catch {
      failures.push('/manifest.webmanifest: JSON inválido')
    }
  }

  for (const [path, expected] of [['/icon.svg', 'image/svg+xml'], ['/opengraph-image', 'image/png']]) {
    const asset = await response(productionUrl, path, fetcher)
    if (asset.failure) failures.push(asset.failure)
    else if (!contentType(asset.result).includes(expected)) failures.push(`${path}: tipo de contenido inválido`)
  }

  return failures
}
