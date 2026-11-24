import test from 'node:test'
import assert from 'node:assert/strict'
import {pointTennisObservation} from '../lib/point-tennis-results'

test('api.tennis final results become independent observations',()=>{
 const result=pointTennisObservation({match_id:'uso-1',date:'2026-09-13',tour:'ATP',tournament:'US Open',round:'F',status:'finished',players:[{id:'a',name:'Carlos Alcaraz'},{id:'s',name:'Jannik Sinner'}],winner_id:'s',score:{sets:[[4,6],[6,3],[2,6]]}},'atp','2026-09-14T09:20:00Z')!
 assert.equal(result.source,'point-tennis')
 assert.equal(result.winner,'Jannik Sinner')
 assert.equal(result.score,'6-4 3-6 6-2')
 assert.equal(result.round,12)
})

test('api.tennis live rows are ignored',()=>{
 assert.equal(pointTennisObservation({date:'2026-09-13',tournament:'US Open',round:'F',status:'live',players:[{id:'a',name:'Carlos Alcaraz'},{id:'s',name:'Jannik Sinner'}],winner_id:'s'},'atp','2026-09-13T20:00:00Z'),null)
})
