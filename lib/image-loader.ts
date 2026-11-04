'use client'

import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width }: ImageLoaderProps) {
  const cleanSrc = src.split('?')[0]
  if (/^\/images\/players\/directory\/.+\.webp$/.test(cleanSrc) && !/-734\.webp$/.test(cleanSrc)) {
    return width <= 1068 ? cleanSrc.replace(/\.webp$/, '-734.webp') : cleanSrc
  }
  if (/^\/images\/tournaments\/detail\/.+\.webp$/.test(src) && !/-\d+\.webp$/.test(src)) {
    const size = width <= 734 ? 734 : width <= 1068 ? 1068 : 1440
    return src.replace(/\.webp$/, `-${size}.webp`)
  }
  if(/^\/images\/players\/wta-licensed\/.+-detail\.webp$/.test(src))return src.replace('-detail.webp',width<=160?'-small.webp':width<=480?'-medium.webp':'-detail.webp');
  if (/^\/images\/home-materials\/(clay|grass|hard)\.webp$/.test(src)) {
    const size = width <= 768 ? 768 : width <= 1440 ? 1440 : 2400
    return src.replace(/\.webp$/, `-${size}.webp`)
  }
  // Venue and editorial originals have checked static variants. A caller may
  // also pass a variant directly; never append a second suffix.
  if (/^\/images\/courts\/.+\.jpg$/.test(src)) {
    const size = width <= 734 ? 734 : width <= 1068 ? 1068 : 1440
    return src.replace(/\.[^.]+$/, `-${size}.webp`)
  }
  if (/^\/images\/players\/optimized\/.+\.webp$/.test(src) && !src.endsWith('-small.webp') && width <= 160) {
    return src.replace(/\.webp$/, '-small.webp')
  }
  return src
}
