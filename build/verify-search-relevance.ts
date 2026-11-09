import assert from 'node:assert/strict';
import cases from './search-relevance-cases.json' with { type: 'json' };
import { GET } from '../app/api/search/route';

type Item={group:string;name:string;href:string};
type Case=(typeof cases)[number];

async function main(){
  for(const scenario of cases as Case[]){
    const url=new URL('https://deuce.test/api/search');
    url.searchParams.set('q',scenario.query);
    url.searchParams.set('tour',scenario.tour);
    url.searchParams.set('mode','quick');
    const response=await GET(new Request(url,{headers:{'x-forwarded-for':`198.51.100.${cases.indexOf(scenario)+10}`} }));
    assert.equal(response.status,200,`${scenario.name}: search returned ${response.status}`);
    const body=await response.json() as {items?:Item[]};
    const items=body.items||[];
    if('expect' in scenario&&scenario.expect){
      const rank=items.findIndex(item=>item.group===scenario.expect!.group&&item.name===scenario.expect!.name)+1;
      assert.ok(rank>0,`${scenario.name}: expected ${scenario.expect.name} was absent`);
      assert.ok(rank<=scenario.expect.maximumRank,`${scenario.name}: expected rank <= ${scenario.expect.maximumRank}, got ${rank}`);
    }
    if('reject' in scenario&&scenario.reject){
      assert.equal(items.some(item=>item.group===scenario.reject!.group&&item.name===scenario.reject!.name),false,`${scenario.name}: leaked ${scenario.reject.name}`);
    }
  }
  console.log(`Search relevance: ${cases.length}/${cases.length} deterministic cases passed.`);
}

main().catch(error=>{console.error(error);process.exitCode=1;});
