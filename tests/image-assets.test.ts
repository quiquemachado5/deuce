import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import cached from '../lib/player-photo-manifest.json'
import imageLoader from '../lib/image-loader'
import { courtPhotoForEdition, courtPhotos } from '../lib/imagery'
import { playerPhoto, playerPhotos } from '../lib/player-imagery'

test('the player directory serves cached local photos with their actual sources', () => {
  for (const [name, photo] of Object.entries(playerPhotos)) {
    assert.ok(existsSync(`public${photo.src}`), `missing ${name} portrait`)
    assert.ok(photo.credit && photo.source, `missing ${name} attribution`)
    const thumbnail = playerPhoto(name)?.thumbnail
    assert.ok(thumbnail && existsSync(`public${thumbnail}`), `missing ${name} thumbnail`)
  }

  for (const name of ['Carlos Alcaraz', 'Jannik Sinner', 'Alex De Minaur']) {
    assert.equal(playerPhoto(name)?.source, cached[name as keyof typeof cached].source)
    assert.equal(playerPhoto(name)?.credit, cached[name as keyof typeof cached].credit)
  }
  assert.match(playerPhoto('Novak Djokovic')?.source || '', /2025_Miami_Open/)
  assert.match(playerPhoto('Rafael Nadal')?.source || '', /2022USOpen/)
  assert.equal(playerPhoto('Marin Cilic')?.src, playerPhoto('Marin Čilić')?.src)
  assert.equal(playerPhoto('Felix Auger–Aliassime')?.src, playerPhoto('Félix Auger-Aliassime')?.src)
})

test('court photos have real responsive files and edition photos never imply another year', () => {
  for (const [tournament, photo] of Object.entries(courtPhotos)) {
    for (const width of [734, 1068, 1440]) {
      const source = imageLoader({ src: photo.src, width })
      assert.ok(existsSync(`public${source}`), `missing ${tournament} ${width}px photo`)
    }
    if (photo.photoYear) {
      assert.equal(courtPhotoForEdition(tournament, photo.photoYear)?.src, photo.src)
      assert.equal(courtPhotoForEdition(tournament, photo.photoYear - 1), null)
    } else {
      assert.equal(courtPhotoForEdition(tournament, 2024), null)
    }
  }
  assert.equal(imageLoader({ src: '/images/courts/miami-2025-734.webp', width: 734 }), '/images/courts/miami-2025-734.webp')
  assert.equal(imageLoader({ src: '/images/players/optimized/novak-djokovic.webp', width: 160 }), '/images/players/optimized/novak-djokovic-small.webp')
})
