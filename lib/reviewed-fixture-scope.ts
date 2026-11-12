import decisions from './reviewed-fixture-scope.json';
import {reviewedTeamCompetition} from './reviewed-team-competition-scope';
import {reviewedFixtureMetadataDecision} from './reviewed-fixture-metadata';
import type {Match} from './types';
const fold=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Documented invitation playoffs stay archived, but never count as a main draw. */
export function isReviewedOutsideMainDraw(match:Match){
 if(reviewedTeamCompetition(match))return true;
 if(reviewedFixtureMetadataDecision(match)?.outsideMainDraw)return true;
 return decisions.some(row=>row.matchId===match.match_id&&row.tour===(match.tour||'atp')&&row.year===match.year&&row.tournament===match.tournament&&row.date===match.context?.date?.slice(0,10)&&row.round===match.round&&((fold(row.first)===fold(match.player1.name)&&fold(row.second)===fold(match.player2.name))||(fold(row.second)===fold(match.player1.name)&&fold(row.first)===fold(match.player2.name))));
}
