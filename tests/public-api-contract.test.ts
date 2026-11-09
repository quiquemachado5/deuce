import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as openApi, OPTIONS as openApiOptions } from '../app/api/v1/openapi/route';
import { GET as matches } from '../app/api/v1/matches/route';
import { csvCell } from '../lib/csv';

test('public OpenAPI contract documents the immutable archive endpoints',async()=>{
  const response=openApi(),body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.openapi,'3.1.0');
  assert.ok(body.paths['/api/v1/archive']);
  assert.ok(body.paths['/api/v1/matches']);
  assert.equal(body.info.version,'1.2.0');
  assert.equal(response.headers.get('access-control-allow-origin'),'*');
  assert.equal(openApiOptions().status,204);
});

test('public match API rejects unsupported query values before opening archive products',async()=>{
  const invalidTour=await matches(new Request('https://deucearchive.com/api/v1/matches?tour=mixed'));
  assert.equal(invalidTour.status,400);
  assert.match((await invalidTour.json()).error,/Invalid tour/);
  const invalidSurface=await matches(new Request('https://deucearchive.com/api/v1/matches?surface=ice'));
  assert.equal(invalidSurface.status,400);
  assert.match((await invalidSurface.json()).error,/Invalid surface/);
  const invalidYear=await matches(new Request('https://deucearchive.com/api/v1/matches?year=recent'));
  assert.equal(invalidYear.status,400);
  const invalidLimit=await matches(new Request('https://deucearchive.com/api/v1/matches?limit=1000'));
  assert.equal(invalidLimit.status,400);
  const oversizedQuery=await matches(new Request(`https://deucearchive.com/api/v1/matches?q=${'a'.repeat(121)}`));
  assert.equal(oversizedQuery.status,400);
});

test('CSV cells neutralize spreadsheet formulas and preserve numeric scores',()=>{
  assert.equal(csvCell('=HYPERLINK("https://example.com")'),'"\'=HYPERLINK(""https://example.com"")"');
  assert.equal(csvCell('+SUM(1,1)'),'"\'+SUM(1,1)"');
  assert.equal(csvCell(-3),'"-3"');
});
