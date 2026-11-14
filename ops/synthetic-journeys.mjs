/** Read-only HTTP journeys; kept separate from real browser/CWV measurements. */
export async function syntheticJourneys(origin,request=fetch){
 const paths=['/','/partidos?tour=wta','/jugadores/rafael-nadal','/comparar?a=Roger+Federer&b=Rafael+Nadal','/records?dato=victorias&find=Nadal','/sitemap.xml'];
 const rows=[];
 for(const path of paths){
  const started=performance.now();
  try{
   const response=await request(origin+path,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'DEUCE-Synthetic/1.0'},cache:'no-store'});
   const ttfb=performance.now()-started,body=await response.text();
   const valid=response.status===200&&(path==='/sitemap.xml'?body.includes('<urlset'):body.includes('<main')&&body.includes('DEUCE'));
   rows.push({path,status:response.status,ttfbMs:Math.round(ttfb),totalMs:Math.round(performance.now()-started),valid});
  }catch{rows.push({path,status:0,ttfbMs:null,totalMs:Math.round(performance.now()-started),valid:false});}
 }
 return rows;
}
