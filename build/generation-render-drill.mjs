import assert from 'node:assert/strict';
import {createElement} from 'react';
import {Writable} from 'node:stream';
import {createRequire} from 'node:module';
import {requestGenerationSelection,generationSelectionKey} from '../lib/revista/generation-selection.ts';
import {asyncCache} from '../lib/async-cache.ts';
const require=createRequire(import.meta.url);
const {renderToPipeableStream}=require('next/dist/compiled/react-server-dom-webpack/server.node');
let active='generation-A',loads=0;
const processCache=asyncCache(300_000,2);
const selected=requestGenerationSelection(async()=>{
 const decision={source:'remote',manifest:{version:active}};
 return processCache(generationSelectionKey(decision),async()=>({version:decision.manifest.version,load:++loads}));
});
const observed=[];
async function Page(){
 const manifest=await selected();
 // A publication changes the process pointer between suspended component reads.
 active='generation-B';
 await new Promise(resolve=>setTimeout(resolve,10));
 const browser=await selected(),products=await selected();
 observed.push([manifest.version,browser.version,products.version]);
 return createElement('section',{'data-manifest':manifest.version,'data-browser':browser.version,'data-products':products.version},manifest.version);
}
const render=()=>new Promise((resolve,reject)=>{
 let body='';const destination=new Writable({write(chunk,_encoding,next){body+=chunk;next();}});
 destination.on('error',reject);destination.on('finish',()=>resolve(body));
 renderToPipeableStream(createElement(Page),{}, {onError:reject}).pipe(destination);
});
const first=await render(),second=await render();
assert.deepEqual(observed,[['generation-A','generation-A','generation-A'],['generation-B','generation-B','generation-B']]);
assert.equal(loads,2);
assert.match(first,/generation-A/);assert.match(second,/generation-B/);
console.log(JSON.stringify({verified:true,renderer:'React Server Components Flight',requests:2,pointerReplacedDuringSuspend:true,loads,observed}));
