/** Presentation calendar only; it never filters or changes sporting data. */
export type AppearanceMode='classic'|'season';
export type CourtSeason='hard'|'clay'|'grass';
export const APPEARANCE_KEY='deuce-appearance';
export function appearanceMode(value:unknown):AppearanceMode{return value==='season'?'season':'classic'}
export function courtSeason(date:Date):CourtSeason{
 const month=date.getUTCMonth()+1,day=date.getUTCDate();
 // European spring swing and Wimbledon period; the remaining season uses hard-court blue.
 if(month===4||month===5||month===6&&day<=7)return 'clay';
 if(month===6||month===7&&day<=14)return 'grass';
 return 'hard';
}
