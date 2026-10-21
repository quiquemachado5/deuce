import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: ['https://deuce-archive.vercel.app/sitemap.xml', ...Array.from({length:new Date().getUTCFullYear()-1967},(_,i)=>`https://deuce-archive.vercel.app/match/sitemap/${1968+i}.xml`)] }
}
