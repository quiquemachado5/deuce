import assert from 'node:assert/strict';
import test from 'node:test';
import {challengeDifficulty,clues,comparativeFeedback,gameEditorial,gameVisual} from '@/lib/daily-game';
import type {Match} from '@/lib/types';

function match(overrides:Partial<Match>={}):Match{
 return {
  match_id:'one',tour:'atp',tournament:'Wimbledon',surface:'grass',category:'Grand Slam',year:2022,
  player1:{name:'Nick Kyrgios',seed:null},player2:{name:'Novak Djokovic',seed:null},
  score_summary:{sets:[],games:[],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:''},
  final_score:'6-4 3-6 4-6 6-7',round:'Final',winner:2,status:'complete',point_tape:[],statistics:[],data_source:'reference',context:{minutes:181},
  ...overrides,
 };
}

test('difficulty reflects age and tournament context',()=>{
 assert.equal(challengeDifficulty(match(),2026).key,'easy');
 assert.equal(challengeDifficulty(match({year:1974,category:'ATP 250'}),2026).key,'legendary');
});

test('clues reveal progressively useful verified context',()=>{
 const result=clues(match());
 assert.equal(result.length,5);
 assert.match(result[0],/ATP.*hierba/);
 assert.match(result[1],/3 h 1 min.*4 sets/);
 assert.match(result[2],/final.*Grand Slam/i);
 assert.doesNotMatch(result.slice(0,3).join(' '),/Wimbledon|2022|Djokovic/);
 assert.match(result[3],/Wimbledon.*2022/);
 assert.match(result[4],/Djokovic.*6-4 3-6/);
});

test('wrong guesses receive a factual comparison',()=>{
 const guess=match({match_id:'two',year:2008,player1:{name:'Rafael Nadal',seed:null},player2:{name:'Roger Federer',seed:null}});
 assert.equal(comparativeFeedback(guess,match()),'El torneo coincide. Busca una edición más reciente por 14 años.');
});

test('the result tells the story from the winner perspective',()=>{
 const editorial=gameEditorial(match());
 assert.equal(editorial.winner,'Novak Djokovic');
 assert.equal(editorial.score,'4–6 6–3 6–4 7–6');
 assert.match(editorial.summary,/Novak Djokovic venció a Nick Kyrgios/);
});

test('the progressive clue resolves an available local court image',()=>{
 assert.equal(gameVisual(match())?.src,'/images/courts/wimbledon-1068.webp');
});

test('every daily match has a licensed visual fallback',()=>{
 const visual=gameVisual(match({tournament:'Evento sin fotografía',surface:'hard'}));
 assert.equal(visual.src,'/images/courts/australian-open-1068.webp');
 assert.match(visual.credit,/Referencia visual de pista dura/);
});
