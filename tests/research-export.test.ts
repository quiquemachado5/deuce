import test from 'node:test';import assert from 'node:assert/strict';import {researchCsv} from '../lib/research/export';import type {ResearchProduct} from '../lib/research/contracts';
const product:ResearchProduct={id:1,tour:'atp',datasetVersion:'a'.repeat(20),definitionVersion:'b'.repeat(24),status:'calculated-in-sample',required:['results'],eligible:2,excluded:0,absoluteRecordEligible:false,limitations:['sample'],rows:[{entity:'=HYPERLINK("bad")',value:-2,sample:2,detail:'one, two\nthree',proof:['match-a','match-b']}]};
test('CSV escapes quotes, commas and newlines and prevents formula execution without changing negative numbers',()=>{
 const csv=researchCsv(product);assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes(',-2,2,'));assert.ok(csv.includes('"one, two\nthree"'));assert.ok(csv.endsWith('\r\n'));assert.ok(csv.includes('evidence_examples'));
});
test('a blocked metric exports headers, never fake zeros or stale rows',()=>{assert.equal(researchCsv({...product,status:'blocked'}).split('\r\n').length,2)});
