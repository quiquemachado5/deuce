import { access } from 'node:fs/promises'
import path from 'node:path'
import { courtPhotos } from '@/lib/imagery'
import { homeMaterials } from '@/lib/home-photography'
import {
  directoryPlayerPhotos,
  playerPhotos,
  publishableWtaPortraits,
} from '@/lib/player-imagery'
import { photoRightsStatus } from '@/lib/photo-rights'

const collections = {
  players: playerPhotos,
  directory: directoryPlayerPhotos,
  wta: publishableWtaPortraits,
  courts: courtPhotos,
  materials: Object.fromEntries(homeMaterials.map(item => [item.surface, item.photo])),
}

const failures: string[] = []
const seen = new Map<string, string>()

function localVariants(src: string) {
  const clean = src.split('?')[0]
  if (/^\/images\/courts\/.+\.jpg$/.test(clean)) return [734, 1068, 1440].map(width => clean.replace(/\.jpg$/, `-${width}.webp`))
  if (/^\/images\/home-materials\/(?:clay|grass|hard)\.webp$/.test(clean)) return [768, 1440, 2400].map(width => clean.replace(/\.webp$/, `-${width}.webp`))
  return [clean]
}

async function main() {
  let references = 0
  for (const [collection, photos] of Object.entries(collections)) {
    for (const [name, photo] of Object.entries(photos)) {
      references += 1
      const label = `${collection}:${name}`
      if (photoRightsStatus(photo) !== 'documented') failures.push(`${label}: rights are not documented`)
      if (!photo.alt?.trim()) failures.push(`${label}: alternative text is missing`)
      for (const [field, value] of [['source', photo.source], ['licenseUrl', photo.licenseUrl]] as const) {
        if (field === 'licenseUrl' && !value) continue
        try {
          const url = new URL(value || '')
          if (url.protocol !== 'https:') failures.push(`${label}: ${field} must use HTTPS`)
        } catch { failures.push(`${label}: ${field} is not a valid URL`) }
      }
      const previous = seen.get(photo.src)
      if (previous && previous !== `${photo.source}|${photo.licenseUrl}`) failures.push(`${label}: local asset has conflicting rights metadata`)
      else seen.set(photo.src, `${photo.source}|${photo.licenseUrl}`)
      if (photo.src.startsWith('/')) {
        for (const variant of localVariants(photo.src)) {
          try { await access(path.join(process.cwd(), 'public', variant.slice(1))) }
          catch { failures.push(`${label}: local asset is missing (${variant})`) }
        }
      }
    }
  }

  const uniqueAssets = seen.size
  if (uniqueAssets < 900) failures.push(`licensed asset coverage regressed: ${uniqueAssets} < 900`)
  if (Object.keys(publishableWtaPortraits).length < 100) failures.push('licensed WTA portrait coverage regressed below 100')

  console.log(JSON.stringify({
    verified: failures.length === 0,
    references,
    uniqueAssets,
    collections: Object.fromEntries(Object.entries(collections).map(([name, photos]) => [name, Object.keys(photos).length])),
    failures,
  }, null, 2))
  if (failures.length) process.exitCode = 1
}

main().catch(error => { console.error(error); process.exitCode = 1 })
