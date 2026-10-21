'use client'
import type { ImageLoaderProps } from 'next/image'
export default function imageLoader({src,width}:ImageLoaderProps) {
 if(src.startsWith('/images/courts/') || src==='/images/editorial/wimbledon-2008-recreation.webp'){
  const size=width<=734?734:width<=1068?1068:1440
  return src.replace(/\.[^.]+$/,`-${size}.webp`)
 }
 if(src.includes('/images/players/optimized/') && !src.endsWith('-small.webp') && width<=160)return src.replace('.webp','-small.webp')
 return src
}
