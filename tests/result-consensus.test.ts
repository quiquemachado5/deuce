import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveResultConsensus,resultContentHash,resultIdentity,type ResultObservation} from '../lib/result-consensus'
import {valuebetObservation} from '../lib/valuebet-results'

const observation=(source:ResultObservation['source'],winner='Carlos Alcaraz',score='6-4 6-3'):ResultObservation=>({
 schema:1,source,sourceUrl:'https://example.com',sourceId:source,retrievedAt:'2026-11-24T09:20:00Z',contentHash:resultContentHash({source,winner,score}),
 identity:resultIdentity('atp','2026-11-23',['Carlos Alcaraz','Jannik Sinner']),tour:'atp',playedOn:'2026-11-23',tournament:'ATP Finals',round:12,
 players:['Carlos Alcaraz','Jannik Sinner'],winner,score,status:'completed',...(source==='tennis-api-results'?{providerRow:{id:'accepted'}}:{}),
})

test('two independent matching sources confirm the provider row',()=>{
 const [entry]=resolveResultConsensus([observation('tennis-api-results'),observation('valuebetennis')])
 assert.equal(entry.status,'confirmed')
 assert.deepEqual(entry.accepted?.providerRow,{id:'accepted'})
})

test('a winner disagreement is quarantined and never accepted',()=>{
 const [entry]=resolveResultConsensus([observation('tennis-api-results'),observation('valuebetennis','Jannik Sinner','6-3 6-4')])
 assert.equal(entry.status,'conflict')
 assert.equal(entry.accepted,undefined)
})

test('reviewed official evidence is authoritative',()=>{
 const [entry]=resolveResultConsensus([observation('tennis-api-results','Jannik Sinner'),observation('official')])
 assert.equal(entry.status,'confirmed-official')
 assert.equal(entry.accepted?.source,'official')
})

test('Valuebetennis keeps walkovers as terminal draw evidence',()=>{
 const row={match_id:'900706',date:'2026-01-01 07:35:00',tournoi:'Australian Open',tournoi_id:'91',categorie:'Grand Chelem',genre:'wta',surface:'dur',tour:'4',joueur1:'Player One',joueur1_id:'1',joueur2:'Player Two',joueur2_id:'2',vainqueur_id:'2',score:'w/o'}
 const result=valuebetObservation(row,'2026-01-02T09:20:00Z')!
 assert.equal(result.status,'walkover')
 assert.equal(result.winner,'Player Two')
 assert.equal(result.round,4)
})
