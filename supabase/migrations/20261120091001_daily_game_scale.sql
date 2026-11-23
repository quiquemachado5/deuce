create table public.deuce_game_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  name_key text not null,
  recovery_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index deuce_game_profiles_recovery_hash_idx
  on public.deuce_game_profiles (recovery_hash)
  where recovery_hash is not null;

create table public.deuce_game_sessions (
  owner_id uuid primary key,
  profile_id uuid not null references public.deuce_game_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index deuce_game_sessions_profile_idx on public.deuce_game_sessions (profile_id);

create table public.deuce_game_challenges (
  date date primary key,
  match_id text not null,
  created_at timestamptz not null default now()
);

create table public.deuce_game_plays (
  profile_id uuid not null references public.deuce_game_profiles(id) on delete cascade,
  challenge_date date not null references public.deuce_game_challenges(date) on delete restrict,
  played_on date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  won boolean not null default false,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  duration_seconds integer generated always as (
    case when finished_at is null then null else greatest(1, extract(epoch from finished_at - started_at)::integer) end
  ) stored,
  primary key (profile_id, challenge_date)
);

create index deuce_game_plays_profile_recent_idx
  on public.deuce_game_plays (profile_id, challenge_date desc);
create index deuce_game_plays_challenge_idx
  on public.deuce_game_plays (challenge_date);
create index deuce_game_plays_daily_rank_idx
  on public.deuce_game_plays (challenge_date, attempts, duration_seconds, finished_at, profile_id)
  where won;

create table public.deuce_game_attempts (
  profile_id uuid not null,
  challenge_date date not null,
  attempt smallint not null check (attempt between 1 and 5),
  match_id text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, challenge_date, attempt),
  unique (profile_id, challenge_date, match_id),
  foreign key (profile_id, challenge_date)
    references public.deuce_game_plays(profile_id, challenge_date) on delete cascade
);

create table public.deuce_game_votes (
  profile_id uuid not null references public.deuce_game_profiles(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  match_id text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, rank),
  unique (profile_id, match_id)
);

create table public.deuce_game_vote_totals (
  match_id text primary key,
  voters bigint not null default 0 check (voters >= 0),
  points bigint not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create index deuce_game_vote_totals_rank_idx
  on public.deuce_game_vote_totals (voters desc, points desc, match_id);

create table public.deuce_game_daily_totals (
  challenge_date date primary key references public.deuce_game_challenges(date) on delete cascade,
  played bigint not null default 0 check (played >= 0),
  wins bigint not null default 0 check (wins >= 0),
  attempt_1 bigint not null default 0 check (attempt_1 >= 0),
  attempt_2 bigint not null default 0 check (attempt_2 >= 0),
  attempt_3 bigint not null default 0 check (attempt_3 >= 0),
  attempt_4 bigint not null default 0 check (attempt_4 >= 0),
  attempt_5 bigint not null default 0 check (attempt_5 >= 0),
  updated_at timestamptz not null default now()
);

create table public.deuce_game_metrics (
  singleton boolean primary key default true check (singleton),
  profiles bigint not null default 0 check (profiles >= 0),
  voters bigint not null default 0 check (voters >= 0),
  updated_at timestamptz not null default now()
);

insert into public.deuce_game_metrics(singleton) values (true);

alter table public.deuce_game_profiles enable row level security;
alter table public.deuce_game_sessions enable row level security;
alter table public.deuce_game_challenges enable row level security;
alter table public.deuce_game_plays enable row level security;
alter table public.deuce_game_attempts enable row level security;
alter table public.deuce_game_votes enable row level security;
alter table public.deuce_game_vote_totals enable row level security;
alter table public.deuce_game_daily_totals enable row level security;
alter table public.deuce_game_metrics enable row level security;

revoke all on public.deuce_game_profiles, public.deuce_game_sessions,
  public.deuce_game_challenges, public.deuce_game_plays, public.deuce_game_attempts,
  public.deuce_game_votes, public.deuce_game_vote_totals,
  public.deuce_game_daily_totals, public.deuce_game_metrics
  from public, anon, authenticated;
grant all on public.deuce_game_profiles, public.deuce_game_sessions,
  public.deuce_game_challenges, public.deuce_game_plays, public.deuce_game_attempts,
  public.deuce_game_votes, public.deuce_game_vote_totals,
  public.deuce_game_daily_totals, public.deuce_game_metrics
  to service_role;

create function public.deuce_game_start(
  p_owner_id uuid,
  p_name text,
  p_name_key text,
  p_challenge_date date,
  p_played_on date
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));

  select profile_id into v_profile_id
  from public.deuce_game_sessions
  where owner_id = p_owner_id;

  if v_profile_id is null then
    insert into public.deuce_game_profiles(name, name_key)
    values (p_name, p_name_key)
    returning id into v_profile_id;

    insert into public.deuce_game_sessions(owner_id, profile_id)
    values (p_owner_id, v_profile_id);

    update public.deuce_game_metrics
    set profiles = profiles + 1, updated_at = now()
    where singleton;
  else
    update public.deuce_game_profiles
    set name = p_name, name_key = p_name_key, updated_at = now()
    where id = v_profile_id;

    update public.deuce_game_sessions
    set last_seen_at = now()
    where owner_id = p_owner_id;
  end if;

  insert into public.deuce_game_plays(profile_id, challenge_date, played_on)
  values (v_profile_id, p_challenge_date, p_played_on)
  on conflict (profile_id, challenge_date) do nothing;

  return v_profile_id;
end;
$$;

create function public.deuce_game_guess(
  p_owner_id uuid,
  p_challenge_date date,
  p_played_on date,
  p_match_id text,
  p_target_id text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_play public.deuce_game_plays%rowtype;
  v_attempt smallint;
  v_correct boolean;
begin
  select profile_id into v_profile_id
  from public.deuce_game_sessions
  where owner_id = p_owner_id;
  if v_profile_id is null then return 'profile_missing'; end if;

  insert into public.deuce_game_plays(profile_id, challenge_date, played_on)
  values (v_profile_id, p_challenge_date, p_played_on)
  on conflict (profile_id, challenge_date) do nothing;

  select * into v_play
  from public.deuce_game_plays
  where profile_id = v_profile_id and challenge_date = p_challenge_date
  for update;

  if v_play.won or v_play.attempts >= 5 then return 'finished'; end if;
  if exists (
    select 1 from public.deuce_game_attempts
    where profile_id = v_profile_id and challenge_date = p_challenge_date and match_id = p_match_id
  ) then return 'duplicate'; end if;

  v_attempt := v_play.attempts + 1;
  v_correct := p_match_id = p_target_id;

  insert into public.deuce_game_attempts(profile_id, challenge_date, attempt, match_id, correct)
  values (v_profile_id, p_challenge_date, v_attempt, p_match_id, v_correct);

  update public.deuce_game_plays
  set attempts = v_attempt,
      won = v_correct,
      finished_at = case when v_correct or v_attempt = 5 then now() else null end
  where profile_id = v_profile_id and challenge_date = p_challenge_date;

  if v_play.attempts = 0 then
    insert into public.deuce_game_daily_totals(challenge_date, played)
    values (p_challenge_date, 1)
    on conflict (challenge_date) do update
    set played = public.deuce_game_daily_totals.played + 1, updated_at = now();
  end if;

  if v_correct then
    insert into public.deuce_game_daily_totals(
      challenge_date, wins, attempt_1, attempt_2, attempt_3, attempt_4, attempt_5
    ) values (
      p_challenge_date, 1,
      (v_attempt = 1)::integer, (v_attempt = 2)::integer, (v_attempt = 3)::integer,
      (v_attempt = 4)::integer, (v_attempt = 5)::integer
    )
    on conflict (challenge_date) do update set
      wins = public.deuce_game_daily_totals.wins + 1,
      attempt_1 = public.deuce_game_daily_totals.attempt_1 + (v_attempt = 1)::integer,
      attempt_2 = public.deuce_game_daily_totals.attempt_2 + (v_attempt = 2)::integer,
      attempt_3 = public.deuce_game_daily_totals.attempt_3 + (v_attempt = 3)::integer,
      attempt_4 = public.deuce_game_daily_totals.attempt_4 + (v_attempt = 4)::integer,
      attempt_5 = public.deuce_game_daily_totals.attempt_5 + (v_attempt = 5)::integer,
      updated_at = now();
  end if;

  return case when v_correct then 'won' when v_attempt = 5 then 'lost' else 'ok' end;
end;
$$;

create function public.deuce_game_vote(
  p_owner_id uuid,
  p_match_ids text[]
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_match_id text;
  v_rank integer;
begin
  if pg_catalog.array_length(p_match_ids, 1) <> 3
     or (select count(distinct value) from pg_catalog.unnest(p_match_ids) as value) <> 3 then
    return 'invalid';
  end if;

  select profile_id into v_profile_id
  from public.deuce_game_sessions
  where owner_id = p_owner_id;
  if v_profile_id is null then return 'profile_missing'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_profile_id::text, 0));
  if exists (select 1 from public.deuce_game_votes where profile_id = v_profile_id) then
    return 'already_voted';
  end if;

  for v_rank in 1..3 loop
    v_match_id := p_match_ids[v_rank];
    insert into public.deuce_game_votes(profile_id, rank, match_id)
    values (v_profile_id, v_rank, v_match_id);

    insert into public.deuce_game_vote_totals(match_id, voters, points)
    values (v_match_id, 1, 4 - v_rank)
    on conflict (match_id) do update
    set voters = public.deuce_game_vote_totals.voters + 1,
        points = public.deuce_game_vote_totals.points + excluded.points,
        updated_at = now();
  end loop;

  update public.deuce_game_metrics
  set voters = voters + 1, updated_at = now()
  where singleton;
  return 'ok';
end;
$$;

create function public.deuce_game_recover(p_owner_id uuid, p_recovery_hash text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_name text;
begin
  select id, name into v_profile_id, v_name
  from public.deuce_game_profiles
  where recovery_hash = p_recovery_hash;
  if v_profile_id is null then return null; end if;

  insert into public.deuce_game_sessions(owner_id, profile_id)
  values (p_owner_id, v_profile_id)
  on conflict (owner_id) do update
  set profile_id = excluded.profile_id, last_seen_at = now();
  return v_name;
end;
$$;

create function public.deuce_game_position(p_owner_id uuid, p_challenge_date date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with current_play as (
    select p.profile_id, p.attempts, p.duration_seconds, p.finished_at
    from public.deuce_game_sessions s
    join public.deuce_game_plays p on p.profile_id = s.profile_id
    where s.owner_id = p_owner_id and p.challenge_date = p_challenge_date and p.won
  ), ranked as (
    select case when exists(select 1 from current_play) then 1 + count(*) else null end as position
    from public.deuce_game_plays p, current_play c
    where p.challenge_date = p_challenge_date and p.won
      and (p.attempts, p.duration_seconds, p.finished_at, p.profile_id)
          < (c.attempts, c.duration_seconds, c.finished_at, c.profile_id)
  )
  select pg_catalog.jsonb_build_object(
    'position', (select position from ranked),
    'total', coalesce((select wins from public.deuce_game_daily_totals where challenge_date = p_challenge_date), 0)
  );
$$;

revoke all on function public.deuce_game_start(uuid,text,text,date,date),
  public.deuce_game_guess(uuid,date,date,text,text),
  public.deuce_game_vote(uuid,text[]),
  public.deuce_game_recover(uuid,text),
  public.deuce_game_position(uuid,date)
  from public, anon, authenticated;
grant execute on function public.deuce_game_start(uuid,text,text,date,date),
  public.deuce_game_guess(uuid,date,date,text,text),
  public.deuce_game_vote(uuid,text[]),
  public.deuce_game_recover(uuid,text),
  public.deuce_game_position(uuid,date)
  to service_role;
