import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  output: 'standalone',
  cacheMaxMemorySize: 128 * 1024 * 1024,
  // Mutable HTML/RSC must not inherit Next's one-year stale window.
  expireTime: 600,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    sri: { algorithm: 'sha256' },
    cssChunking: true,
  },
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { '/*': ['./data/archive/**/*', './data/reading/**/*'] },
  outputFileTracingExcludes: {
    // Research PDFs/HTML are preserved in the source archive. Requests consume
    // reviewed registries and prepared shards; shipping the evidence scans to
    // every application image adds 150 MB without serving a single route.
    '/*': ['./.deuce-cache/**/*', './data/reading/matches.json.gz', './data/archive/references/**/*'],
  },
  async headers() { return [
    {source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'},
      {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
      {key:'Origin-Agent-Cluster',value:'?1'},
      {key:'X-DNS-Prefetch-Control',value:'off'},
    ]},
    {source:'/images/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, must-revalidate'}]},
    {source:'/media/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, must-revalidate'}]},
    {source:'/videos/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, must-revalidate'}]},
    {source:'/fonts/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
  ] },
  async redirects() {
    return [
      {source:'/info',destination:'/sobre',permanent:true},
      ...['q','search','player','tournament','year','round','surface','fiveSets'].map(key=>({
        source:'/',
        has:[{type:'query' as const,key}],
        destination:'/buscar',
        permanent:false,
      })),
    ]
  },
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts', deviceSizes: [734,1068,1440], imageSizes: [36,80,160,480], qualities: [75,88] },
}
export default nextConfig
