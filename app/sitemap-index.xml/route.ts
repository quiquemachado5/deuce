import { sitemapIndexLocations } from '@/lib/sitemap-locations';

export const revalidate = 3600;

export function GET() {
  const entries = sitemapIndexLocations().map((location) => `  <sitemap><loc>${location}</loc></sitemap>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
