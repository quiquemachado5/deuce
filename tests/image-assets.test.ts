import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import cached from '../lib/player-photo-manifest.json'
import refreshed from '../lib/player-photo-refresh.json'
import discovered from '../lib/player-photo-discovery.json'
import wtaPortraits from '../lib/player-photo-wta.json'
import imageLoader from '../lib/image-loader'
import { courtPhoto, courtPhotoForEdition, courtPhotos, premiumCourtPhotoNames } from '../lib/imagery'
import { directoryPlayerPhotos, playerDirectoryPhoto, playerPhoto, playerPhotos, publishableWtaPortraits } from '../lib/player-imagery'
import { playerPhotoAtTournament } from '../lib/tournament-media'
import { tournamentDetailPhoto, tournamentDetailFeaturePhoto } from '../lib/tournament-detail-media'
import { photoRightsStatus } from '../lib/photo-rights'

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

  for (const photo of Object.values(directoryPlayerPhotos)) {
    const responsive = imageLoader({ src: photo.src, width: 734 })
    assert.ok(existsSync(`public${responsive}`), `missing directory hero variant for ${photo.src}`)
  }

  for (const name of ['Jannik Sinner', 'Alex De Minaur']) {
    assert.equal(playerPhoto(name)?.source, cached[name as keyof typeof cached].source)
    assert.equal(playerPhoto(name)?.credit, cached[name as keyof typeof cached].credit)
  }
  assert.match(playerPhoto('Novak Djokovic')?.source || '', /2025_Miami_Open/)
  assert.match(playerPhoto('Rafael Nadal')?.source || '', /commons\.wikimedia\.org/)
  assert.match(playerDirectoryPhoto('Rafael Nadal')?.source || '', /commons\.wikimedia\.org/)
  assert.equal(playerPhoto('Iga Świątek'), null)
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

test('provider portraits without documented reuse rights stay unpublished', () => {
  const undocumented = Object.entries(wtaPortraits).filter(([, photo]) => !('licenseUrl' in photo) || !photo.licenseUrl)
  assert.ok(undocumented.length > 0)
  for (const [name, photo] of undocumented) {
    assert.equal(publishableWtaPortraits[name], undefined, name)
    assert.equal(existsSync(`public${photo.src}`), false, `${name} must remain outside public/ until licensed`)
  }
  for (const photo of Object.values(publishableWtaPortraits)) assert.equal(photoRightsStatus(photo), 'documented')
  for (const photo of Object.values(playerPhotos)) assert.equal(photoRightsStatus(photo), 'documented', photo.src)
})

test('every published photograph has a source, credit and explicit audit state', () => {
  const rows = [...Object.values(playerPhotos), ...Object.values(courtPhotos)]
  for (const photo of rows) {
    assert.ok(photo.source.startsWith('http'), `invalid photo source: ${photo.src}`)
    assert.ok(photo.credit.trim(), `missing photo credit: ${photo.src}`)
    assert.equal(photoRightsStatus(photo), 'documented', photo.src)
  }
  assert.ok(rows.some(photo => photoRightsStatus(photo) === 'documented'))
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
    if (/\.jpg$/i.test(photo.src)) {
      assert.equal(existsSync(`public${photo.src}`), false, `${tournament} should ship responsive WebP files, not the source JPG`)
    }
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

test('tournament detail photography ships responsive hero and editorial variants', () => {
  for (const tournament of ['Australian Open', 'Roland Garros', 'US Open', 'Wimbledon']) {
    for (const photo of [tournamentDetailPhoto(tournament), tournamentDetailFeaturePhoto(tournament)]) {
      assert.ok(photo, `${tournament} should have documented detail photography`)
      for (const width of [734, 1068, 1440]) {
        const source = imageLoader({ src: photo!.src, width })
        assert.ok(existsSync(`public${source}`), `missing ${tournament} ${width}px detail photo`)
      }
    }
  }
})
