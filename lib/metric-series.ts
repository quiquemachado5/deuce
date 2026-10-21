export type TrendPoint = {label:string;value:number|null}
/** Missing seasons are empty slots, never an interpolated value or zero. */
export function withYearGaps(points:TrendPoint[]):TrendPoint[] {
 if(points.length<2 || points.some(p=>!/^\d{4}$/.test(p.label)))return points
 const byYear=new Map(points.map(p=>[Number(p.label),p]))
 const first=Math.min(...byYear.keys()),last=Math.max(...byYear.keys())
 return Array.from({length:last-first+1},(_,i)=>byYear.get(first+i)||{label:String(first+i),value:null})
}
