import windows from './event-windows.json';
type Window={event:string;year:number;start:string;end:string;sources:string[]};
const date=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
/** Both dates describe the main draw, not qualifying or an inferred tournament week. */
export function corroboratedEventWindows(rows:readonly Window[]){
 const output=new Map<string,{start:string;end:string}>();
 for(const row of rows){
  if(!date(row.start)||!date(row.end)||row.end<row.start||Number(row.start.slice(0,4))!==row.year)throw new Error('Invalid event window');
  const publishers=new Set(row.sources.map(source=>{const u=new URL(source);if(u.protocol!=='https:')throw new Error('Invalid calendar source');return u.hostname.replace(/^(www|prod-foundation)\./,'')}));
  if(publishers.size<2)throw new Error('Event window needs independent publishers');
  const key=row.event+'|'+row.year;if(output.has(key))throw new Error('Duplicate event window');
  output.set(key,{start:row.start,end:row.end});
 }
 return output;
}
export const reviewedEventWindows=()=>corroboratedEventWindows(windows);
