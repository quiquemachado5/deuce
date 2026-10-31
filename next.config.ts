import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
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
  async headers() { return [
    {source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; upgrade-insecure-requests"},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'},
      {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
      {key:'Origin-Agent-Cluster',value:'?1'},
      {key:'X-DNS-Prefetch-Control',value:'off'},
    ]},
    {source:'/images/:path*',headers:[{key:'Cache-Control',value:'public, max-age=2592000, stale-while-revalidate=604800'}]},
    {source:'/videos/:path*',headers:[{key:'Cache-Control',value:'public, max-age=2592000, stale-while-revalidate=604800'}]},
    {source:'/fonts/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
  ] },
  async redirects() {
    return [
      { source: '/partidos', destination: '/buscar', permanent: true },
      ...['q','search','player','tournament','year','round','surface','fiveSets'].map(key=>({
        source:'/',
        has:[{type:'query' as const,key}],
        destination:'/buscar',
        permanent:false,
      })),
    ]
  },
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts', deviceSizes: [734,1068,1440], imageSizes: [36,80,160,480] },
}
export default nextConfig
