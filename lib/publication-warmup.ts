const paths=['/api/overview','/comparar?a=Roger+Federer&b=Rafael+Nadal','/jugadores/rafael-nadal','/records?dato=victorias&find=Nadal','/partidos'];
/** Warm only our own read routes, sequentially, after the publication worker exits. */
export async function warmPublishedNavigation(port=3000,request:typeof fetch=fetch){
 const origin=`http://127.0.0.1:${Number.isInteger(port)&&port>0&&port<=65535?port:3000}`,rows=[];
 for(const path of paths){const started=performance.now();
  try{const response=await request(origin+path,{signal:AbortSignal.timeout(15000),cache:'no-store',headers:{'User-Agent':'DEUCE-Warmup/1.0'}});await response.arrayBuffer();rows.push({path,status:response.status,ms:Math.round(performance.now()-started)});}
  catch{rows.push({path,status:0,ms:Math.round(performance.now()-started)});}
 }
 return rows;
}
