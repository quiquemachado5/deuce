import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import cached from '../lib/player-photo-manifest.json'
import refreshed from '../lib/player-photo-refresh.json'
import discovered from '../lib/player-photo-discovery.json'
import imageLoader from '../lib/image-loader'
import { courtPhoto, courtPhotoForEdition, courtPhotos, premiumCourtPhotoNames } from '../lib/imagery'
import { playerDirectoryPhoto, playerPhoto, playerPhotos } from '../lib/player-imagery'
import { playerPhotoAtTournament } from '../lib/tournament-media'

test('the player directory serves cached local photos with their actual sources', () => {
  const restoredPortraits = new Set(['Jimmy Connors', 'Roger Federer', 'Ivan Lendl', 'John McEnroe'])
  for (const [name, photo] of Object.entries(playerPhotos)) {
    assert.ok(existsSync(`public${photo.src}`), `missing ${name} portrait`)
    assert.ok(photo.credit && photo.source, `missing ${name} attribution`)
    if (restoredPortraits.has(name)) {
      const restored = playerPhoto(name)
      assert.ok(restored?.licenseUrl && restored?.avatarCrop, `${name} requires licensed, inspected framing`)
      assert.equal(restored.source, photo.source)
    }
    const thumbnail = playerPhoto(name)?.thumbnail
    assert.ok(thumbnail && existsSync(`public${thumbnail}`), `missing ${name} thumbnail`)
  }

  for (const name of ['Jannik Sinner', 'Alex De Minaur']) {
    assert.equal(playerPhoto(name)?.source, cached[name as keyof typeof cached].source)
    assert.equal(playerPhoto(name)?.credit, cached[name as keyof typeof cached].credit)
  }
  assert.match(playerPhoto('Novak Djokovic')?.source || '', /2025_Miami_Open/)
  assert.match(playerPhoto('Rafael Nadal')?.source || '', /biografieonline/)
  assert.match(playerDirectoryPhoto('Rafael Nadal')?.source || '', /biografieonline/)
  assert.match(playerPhoto('Iga Świątek')?.source || '', /wtatennis\.com\/players/)
  for (const [name, photo] of Object.entries(refreshed)) {
    if (name !== 'Rafael Nadal') assert.equal(playerPhoto(name)?.src, photo.src)
    assert.ok(photo.photoYear >= 2024)
    assert.ok(photo.licenseUrl && photo.source)
  }
  for (const [name, photo] of Object.entries(discovered)) {
    assert.ok(existsSync(`public${photo.src}`), `missing discovered ${name} portrait`)
    assert.match(photo.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    assert.match(photo.licenseUrl, /^https?:\/\//)
    assert.match(photo.credit, /CC(?:0| BY)/)
  }
  assert.equal(playerPhoto('Marin Cilic')?.src, playerPhoto('Marin Čilić')?.src)
  assert.equal(playerPhoto('Felix Auger–Aliassime')?.src, playerPhoto('Félix Auger-Aliassime')?.src)
})

test('tournament pages prefer documented event photography and always fall back to a face', () => {
  assert.match(playerPhotoAtTournament('Novak Djokovic', 'Wimbledon', [2019])?.alt || '', /Wimbledon 2019/)
  assert.ok(playerPhotoAtTournament('Novak Djokovic', 'US Open'))
  assert.match(playerPhotoAtTournament('Jannik Sinner', 'US Open')?.source || '', /US_Open/)
  assert.ok(playerPhotoAtTournament('Rafael Nadal', 'US Open'))
  assert.ok(playerPhotoAtTournament('Rafael Nadal', 'Wimbledon'))
})

test('court photos have real responsive files and edition photos never imply another year', () => {
  for (const tournament of premiumCourtPhotoNames) {
    assert.ok(courtPhoto(tournament), `missing premium tournament venue: ${tournament}`)
  }
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
