import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { '/*': ['./data/archive/**/*', './data/reading/**/*'] },
  async headers() { return [
    {source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'SAMEORIGIN'},
      {key:'Content-Security-Policy',value:"frame-ancestors 'self'; object-src 'none'; base-uri 'self'"},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    ]},
    {source:'/images/:path*',headers:[{key:'Cache-Control',value:'public, max-age=604800, stale-while-revalidate=86400'}]},
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
