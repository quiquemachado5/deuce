import test from 'node:test';
import assert from 'node:assert/strict';
import { playerBiography } from '../lib/player-bio';
import { playerPhoto } from '../lib/player-imagery';

test('WTA result cards can resolve countries beyond the old 27-profile index', () => {
  for (const [name,country] of [['Mei Yamaguchi','jpn'],['Mary Stoiana','usa'],['Aliaksandra Sasnovich','blr'],['Jelena Ostapenko','lat']]) {
    assert.equal(playerBiography(name,'wta')?.country,country,name);
  }
});
test('expanded WTA portraits include documented sources and compact thumbnails', () => {
  for (const name of ['Coco Gauff','Naomi Osaka','Elena Rybakina','Jessica Pegula','Mirra Andreeva']) {
    const photo=playerPhoto(name,'wta');
    assert.ok(photo,name);
    assert.ok(photo.source?.startsWith('https://'),name);
    assert.ok(photo.credit,name);
    assert.ok(photo.thumbnail?.endsWith('-small.webp'),name);
  }
});
