'use client'

import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width }: ImageLoaderProps) {
  // Venue and editorial originals have checked static variants. A caller may
  // also pass a variant directly; never append a second suffix.
  if (/^\/images\/(?:courts|editorial)\/.+\.jpg$/.test(src) || src === '/images/editorial/wimbledon-2008-recreation.webp') {
    const size = width <= 734 ? 734 : width <= 1068 ? 1068 : 1440
    return src.replace(/\.[^.]+$/, `-${size}.webp`)
  }
  if (/^\/images\/players\/optimized\/.+\.webp$/.test(src) && !src.endsWith('-small.webp') && width <= 160) {
    return src.replace(/\.webp$/, '-small.webp')
  }
  return src
}
