import test from 'node:test'
import assert from 'node:assert/strict'
import {auditConsensusDraws} from '../lib/result-draw-audit'
import type {ResultConsensusEntry,ResultObservation} from '../lib/result-consensus'

function draw(missingFirstRound=false){
 const expected:Record<number,number>={4:missingFirstRound?63:64,5:32,6:16,7:8,9:4,10:2,12:1}
 const entries:ResultConsensusEntry[]=[]
 for(const [round,count] of Object.entries(expected))for(let index=0;index<count;index++){
  const observation:ResultObservation={schema:1,source:'tennis-api-results',sourceUrl:'https://docs.tennis-api.com/results',sourceId:`${round}-${index}`,retrievedAt:'2026-02-02T09:20:00Z',contentHash:`hash-${round}-${index}`,identity:`atp|2026-01-${String(index+1).padStart(2,'0')}|p${round}-${index}`,tour:'atp',playedOn:'2026-01-20',tournament:'Australian Open',level:'grand_slam',round:Number(round),players:[`Winner ${round} ${index}`,`Loser ${round} ${index}`],winner:`Winner ${round} ${index}`,score:'6-3 6-4',status:index===0&&round==='4'?'walkover':'completed'}
  entries.push({identity:observation.identity,status:'confirmed',observations:[observation],accepted:observation})
 }
 return entries
}

test('a complete 128-player Grand Slam draw includes terminal results',()=>{
 const [edition]=auditConsensusDraws(draw()).editions
 assert.equal(edition.complete,true)
 assert.equal(edition.confirmed,127)
 assert.equal(edition.terminal,1)
})

test('one missing opening-round result is visible after the final',()=>{
 const [edition]=auditConsensusDraws(draw(true)).editions
 assert.equal(edition.complete,false)
 assert.deepEqual(edition.missing,['1 resultado · ronda 4'])
})
