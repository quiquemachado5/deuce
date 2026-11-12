import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {canonicalResearchInput,researchDefinitionVersion,researchSources,writeResearchGeneration} from '../lib/research/generation';
import type {ResearchProduct} from '../lib/research/contracts';

test('formula identity includes sources and evidence independently of collection insertion order',()=>{
 const first=researchDefinitionVersion({'recipe.ts':'a','helper.ts':'b'},{certifiedEditions:new Set(['atp|a','wta|b']),hands:new Map([['A','L'],['B','R']])});
 const reordered=researchDefinitionVersion({'helper.ts':'b','recipe.ts':'a'},{hands:new Map([['B','R'],['A','L']]),certifiedEditions:new Set(['wta|b','atp|a'])});
 assert.equal(first,reordered);
 assert.notEqual(first,researchDefinitionVersion({'recipe.ts':'changed','helper.ts':'b'},{certifiedEditions:new Set(['atp|a','wta|b'])}));
 assert.notEqual(first,researchDefinitionVersion({'recipe.ts':'a','helper.ts':'b'},{certifiedEditions:new Set(['atp|a'])}));
 assert.throws(()=>canonicalResearchInput({invalid:NaN}),/Non-finite/);
});

test('formula capture follows imported helpers and registries, including nested dependencies',async()=>{
 const root=await mkdtemp(join(tmpdir(),'deuce-formula-'));
 try{
  await writeFile(join(root,'main.ts'),"import {result} from './helper'; export {result};");
  await writeFile(join(root,'helper.ts'),"import rules from './rules.json'; export const result=rules;");
  await writeFile(join(root,'rules.json'),'{"version":1}');
  const before=await researchSources(root,['main.ts']);
  assert.deepEqual(Object.keys(before).sort(),['helper.ts','main.ts','rules.json']);
  await writeFile(join(root,'rules.json'),'{"version":2}');
  const after=await researchSources(root,['main.ts']);
  assert.notEqual(researchDefinitionVersion(before,{}),researchDefinitionVersion(after,{}));
 }finally{await rm(root,{recursive:true,force:true})}
});

test('immutable research artifacts preserve old formulas and reject differing output for the same identity',async()=>{
 const root=await mkdtemp(join(tmpdir(),'deuce-research-')),dataset='a'.repeat(20),v1='1'.repeat(24),v2='2'.repeat(24);
 try{
  const first=await writeResearchGeneration(root,dataset,v1,[],{at:'first'});
  assert.equal(first.reused,false);
  const bytes=await readFile(join(first.directory,'products.json.gz'));
  assert.equal((await writeResearchGeneration(root,dataset,v1,[],{at:'later'})).reused,true);
  assert.deepEqual(await readFile(join(first.directory,'products.json.gz')),bytes);
  await writeResearchGeneration(root,dataset,v2,[],{at:'new formula'});
  const pointer=()=>readFile(join(root,dataset,'latest.json'),'utf8').then(JSON.parse);
  assert.equal((await pointer()).definitionVersion,v2);
  await assert.rejects(writeResearchGeneration(root,dataset,v1,[{id:999} as ResearchProduct],{}),/not reproducible/);
  assert.equal((await pointer()).definitionVersion,v2);
  assert.deepEqual(await readFile(join(first.directory,'products.json.gz')),bytes);
  await assert.rejects(writeResearchGeneration(root,'../unsafe',v1,[],{}),/identity/);
 }finally{await rm(root,{recursive:true,force:true})}
});
