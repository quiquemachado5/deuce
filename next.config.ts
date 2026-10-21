import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { '/*': ['./data/archive/**/*', './data/reading/**/*'] },
  async headers() { return [{source:'/images/:path*',headers:[{key:'Cache-Control',value:'public, max-age=604800, stale-while-revalidate=86400'}]},{source:'/fonts/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]}] },
  async redirects() { return ['q','search','player','tournament','year','round','surface','fiveSets'].map(key=>({source:'/',has:[{type:'query' as const,key}],destination:'/partidos',permanent:false})) },
  images: { loader: 'custom', loaderFile: './lib/image-loader.ts', deviceSizes: [734,1068,1440], imageSizes: [36,80,160,480] },
}
export default nextConfig
