type Query=Record<string,string|undefined>;
/** Identity is symmetric; comparison filters remain part of its reproducible scope. */
export function comparisonCanonical(query:Query,base='/comparar'){
 const params=new URLSearchParams();
 if(query.tour==='wta')params.set('tour','wta');
 const names=[query.a,query.b].map(value=>value?.normalize('NFKC').trim().replace(/\s+/g,' ')).filter((value):value is string=>!!value).sort((a,b)=>a.localeCompare(b,'es'));
 if(names[0])params.set('a',names[0]);if(names[1])params.set('b',names[1]);
 const scope={from:query.from||query.fromYear||(query.year!=='all'?query.year:undefined),to:query.to||query.toYear||(query.year!=='all'?query.year:undefined),period:query.period,surface:query.surface,competition:query.competition,age:query.age,minimum:query.minimum};
 for(const [key,value] of Object.entries(scope))if(value&&value!=='all'&&value!=='career')params.set(key,value);
 return base+(params.size?'?'+params:'');
}
