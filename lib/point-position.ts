import { closedSet } from './quality'
/** Provider appends a new games column only after its first game ends. */
export function pointPosition(games:number[][], rawSets:unknown) {
  const last=games.at(-1)||[0,0]
  const completed=Array.isArray(rawSets)&&rawSets.length===2&&rawSets.every(n=>Number.isInteger(n)&&n>=0) ? rawSets[0]+rawSets[1] : null
  if(games.length && completed===games.length && closedSet(last)) return {set:games.length+1,game:1}
  return {set:Math.max(1,games.length),game:last[0]+last[1]+1}
}
