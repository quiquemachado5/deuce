import type {RecordRow} from './revista/records';
import {normalizeText} from './quality';
/** Search the entire ranking, preserving its published position and ties. */
export function searchRecordRows(rows:RecordRow[],term:string){
 const words=normalizeText(term.slice(0,100)).split(/\s+/).filter(Boolean);
 if(!words.length)return rows;
 let rank=0;
 return rows.flatMap((row,index)=>{if(index===0||rows[index-1].value!==row.value)rank=index+1;return words.every(word=>normalizeText(row.name).includes(word))?[{...row,position:rank}]:[];});
}
