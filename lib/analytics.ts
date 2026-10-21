import type { Match, Point } from './types'
export function rallyBuckets(points:Point[], player:1|2){
 const known=points.filter(p=>p.rally_length!==null&&p.winner!==null)
 return [{label:'1–4',min:1,max:4},{label:'5–8',min:5,max:8},{label:'9+',min:9,max:Infinity}].map(b=>{const subset=known.filter(p=>p.rally_length!>=b.min&&p.rally_length!<=b.max);return {...b,total:subset.length,won:subset.filter(p=>p.winner===player).length,rate:subset.length?Math.round(subset.filter(p=>p.winner===player).length/subset.length*100):null}})
}
export function clutchBuckets(points:Point[],player:1|2){
 return [{label:'30–30',test:(p:Point)=>p.score.replace(/\s/g,'').includes('30-30')},{label:'Deuce',test:(p:Point)=>p.score.toLowerCase().includes('deuce')||p.score.replace(/\s/g,'').includes('40-40')},{label:'Break point',test:(p:Point)=>p.is_break_point===true}].map(b=>{const subset=points.filter(p=>b.test(p)&&p.winner!==null);return {label:b.label,total:subset.length,won:subset.filter(p=>p.winner===player).length}})
}
export function detectPatterns(matches:Match[]){
 const marathon=matches.flatMap(m=>{const games=new Map<string,Point[]>();m.point_tape.forEach(p=>{const k=`${p.set}-${p.game}`;games.set(k,[...(games.get(k)||[]),p])});return [...games].filter(([,v])=>v.filter(p=>p.score.toLowerCase().includes('deuce')||p.score.replace(/\s/g,'').includes('40-40')).length>8).map(([k,v])=>({match:m,key:k,count:v.length}))})
 const comebacks=matches.filter(m=>m.point_tape.filter(p=>p.is_match_point&&p.match_point_for!==null&&p.match_point_for!==undefined&&p.match_point_for!==m.winner&&p.winner===m.winner).length>=3)
 const serveCollapse=matches.map(m=>({match:m,points:m.point_tape.filter(p=>p.first_serve_in===false&&p.is_break_point===true&&p.server!==null&&p.winner!==null&&p.winner!==p.server),})).filter(x=>x.points.length>0)
 return {marathon,comebacks,serveCollapse}
}
