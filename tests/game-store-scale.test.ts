import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const migration=readFileSync(new URL('../supabase/migrations/20261120091001_daily_game_scale.sql',import.meta.url),'utf8');

test('daily game persistence is normalized for large user counts',()=>{
 for(const table of ['profiles','sessions','challenges','plays','attempts','votes','vote_totals','daily_totals','metrics'])assert.match(migration,new RegExp(`create table public\\.deuce_game_${table}`));
 assert.doesNotMatch(migration,/jsonb\s+not null/i);
 assert.match(migration,/deuce_game_plays_daily_rank_idx/);
 assert.match(migration,/deuce_game_vote_totals_rank_idx/);
});

test('daily game writes are atomic and public access stays closed',()=>{
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/create function public\.deuce_game_guess/);
 assert.match(migration,/create function public\.deuce_game_vote/);
 assert.match(migration,/enable row level security/g);
 assert.match(migration,/revoke all[\s\S]+from public, anon, authenticated/);
 assert.match(migration,/grant execute[\s\S]+to service_role/);
});
