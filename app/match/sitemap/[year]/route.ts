import { preparedMatchSitemapArchive } from '@/lib/revista/read-records'
import { matchSitemapEntries } from '@/lib/sitemap-locations'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const escapeXml = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
})[character]!)

function sitemapXml(year: number) {
  return preparedMatchSitemapArchive(year).then(matches => {
    const entries = matchSitemapEntries(matches, year)
    const urls = entries.map(entry => {
      const lastModified = entry.lastModified
        ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>`
        : ''
      const alternates = Object.entries(entry.alternates?.languages ?? {})
        .map(([language, href]) => `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href)}" />`)
        .join('')
      return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified}<changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority>${alternates}</url>`
    }).join('')
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`
  })
}

export async function GET(_request: Request, { params }: { params: Promise<{ year: string }> }) {
  const rawYear = (await params).year.replace(/\.xml$/i, '')
  const year = Number(rawYear)
  if (!Number.isInteger(year) || year < 1968 || year > new Date().getUTCFullYear()) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(await sitemapXml(year), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
