import test from 'node:test';
import assert from 'node:assert/strict';
import { tournamentEditionStory } from '../lib/tournament-story';
import type { Match } from '../lib/types';

const scope={tournament:'Example',year:2024,category:'ATP 500',tour:'atp' as const};
function match(id:string,round:string,opponent:string,games:number[][],extra:Partial<Match>={}):Match{
  return {match_id:id,tournament:'Example',year:2024,category:'ATP 500',tour:'atp',surface:'hard',player1:{name:'Champion',seed:null},player2:{name:opponent,seed:null},winner:1,status:'finished',score_summary:{sets:[],games,points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:''},round,final_score:'',point_tape:[],statistics:[],data_source:'reference',...extra};
}
test('edition story isolates tour/year/category and excludes unfinished matches',()=>{
  const semi=match('semi','Semifinal','Other',[[6,3],[6,2]]);
  const final=match('final','Final','Finalist',[[4,6],[7,6],[6,2]]);
  const rows=[semi,final,
    match('women','Final','Other',[[6,0],[6,0]],{tour:'wta'}),
    match('prior','Final','Other',[[6,0],[6,0]],{year:2023}),
    match('other-category','Final','Other',[[6,0],[6,0]],{category:'ATP 250'}),
    match('not-finished','Final','Other',[[6,0]],{status:'live'})];
  const story=tournamentEditionStory(rows,scope);
  assert.equal(story.rounds[0].matches,2);
  assert.equal(story.rounds[0].sets,5);
  assert.equal(story.rounds[0].comebacks,1);
  assert.equal(story.rounds[0].tiebreaks,1);
  assert.deepEqual(story.path.map(row=>row.match_id),['semi','final']);
  assert.equal(story.leaders[0].name,'Champion');
  assert.equal(story.leaders[0].wins,2);
  assert.equal(story.leaders[0].lostSets,1);
});
test('a winning path omits a prior loss and an empty edition never fabricates a champion',()=>{
  const story=tournamentEditionStory([
    match('lost','Round of 32','Other',[[2,6],[3,6]],{winner:2}),
    match('won','Final','Finalist',[[6,3],[6,2]]),
  ],scope);
  assert.deepEqual(story.path.map(row=>row.match_id),['won']);
  const empty=tournamentEditionStory([],scope);
  assert.deepEqual(empty.path,[]);
  assert.deepEqual(empty.leaders,[]);
  assert.equal(empty.rounds[0].matches,0);
});
