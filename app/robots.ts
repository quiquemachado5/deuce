import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/site-origin'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: ['GPTBot','ClaudeBot','Claude-Web','anthropic-ai','CCBot','Bytespider','Amazonbot','PetalBot','meta-externalagent','Google-Extended'], disallow: '/' },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap-index.xml`,
  }
}
