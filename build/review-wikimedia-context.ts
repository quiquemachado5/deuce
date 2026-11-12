import {writeFile} from 'node:fs/promises';
import context from '../lib/player-wikimedia-context.json';
import {compareWikiBiography,type WikiContextIndex} from '../lib/wikimedia-context';
import {providerPlayerBiography} from '../lib/player-bio';

// Offline, reproducible comparison. It never changes a provider biography.
const people=Object.values(context as WikiContextIndex).map(person=>({name:person.name,tour:person.tour,entity:person.entity,comparisons:compareWikiBiography(person,providerPlayerBiography(person.name,person.tour)||{}),contestedFields:person.contestedFields||[],heightCm:person.heightCm,source:person.source}));
const records=Object.values(context as WikiContextIndex),comparisons=people.flatMap(person=>person.comparisons);
const summary={people:people.length,birthdays:records.filter(person=>person.birthday).length,playingHands:records.filter(person=>person.playingHand).length,backhands:records.filter(person=>person.backhand).length,heights:records.filter(person=>person.heightCm).length,matched:comparisons.filter(row=>row.state==='matched').length,missingProvider:comparisons.filter(row=>row.state==='missing-provider').length,conflicts:comparisons.filter(row=>row.state==='conflict').length,contestedWikidata:people.filter(person=>person.contestedFields.length).length};
async function main(){
  await writeFile('data/integrity/wikimedia-biography-review-2026-11-11.json',JSON.stringify({at:new Date().toISOString(),summary,people},null,2)+'\n');
  console.log(summary);
}
main().catch(error=>{console.error(error);process.exitCode=1});
