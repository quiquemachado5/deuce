import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site-origin'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: [`${SITE_ORIGIN}/sitemap.xml`, ...Array.from({length:new Date().getUTCFullYear()-1967},(_,i)=>`${SITE_ORIGIN}/match/sitemap/${1968+i}.xml`)] }
}
