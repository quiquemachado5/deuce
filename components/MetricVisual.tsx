import { withYearGaps, type TrendPoint } from '@/lib/metric-series'
export type { TrendPoint }
export default function MetricVisual({value,unit,trend,trendLabel='Por temporada'}:{value:number;unit:string;trend?:TrendPoint[];trendLabel?:string}) {
 if(trend&&trend.length>1){
  const series=withYearGaps(trend),max=Math.max(...series.map(point=>point.value??0),1)
  return <div className="metric-history"><div className="metric-history-bars" role="img" aria-label={`${trendLabel}: ${series.map(p=>`${p.label}: ${p.value===null?'sin dato':`${p.value}${unit}`}`).join('; ')}`}>{series.map(p=><span className={p.value===null?'metric-gap':undefined} key={p.label} title={`${p.label}: ${p.value===null?'sin dato':`${p.value.toLocaleString('es-ES')}${unit}`}`}>{p.value!==null&&<i style={{height:`${Math.max(0,p.value)/max*100}%`}}/>}</span>)}</div><span>{series[0].label}</span><span>{series.at(-1)!.label}</span>{series.some(p=>p.value===null)&&<small>Años sin dato: huecos punteados.</small>}</div>
 }
 if(unit.trim()==='%'&&value>=0&&value<=100)return <div className="metric-percent" aria-hidden="true"><i style={{width:`${value}%`}}/><span>0</span><span>100%</span></div>
 return null
}
