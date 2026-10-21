-- Recovered verbatim from the remote migration history, not a reconstructed schema.
create table public.deuce_archive_objects (
 key text primary key,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.deuce_archive_objects enable row level security;
revoke all on public.deuce_archive_objects from anon, authenticated;
grant all on public.deuce_archive_objects to service_role;
create table public.deuce_sync_lease (
 name text primary key,
 owner uuid not null,
 expires_at timestamptz not null
);
alter table public.deuce_sync_lease enable row level security;
revoke all on public.deuce_sync_lease from anon, authenticated;
grant all on public.deuce_sync_lease to service_role;
create function public.deuce_acquire_lease(lease_name text, lease_owner uuid, ttl_seconds integer default 300)
returns boolean language sql security invoker set search_path = '' as $$
 with acquired as (
 insert into public.deuce_sync_lease(name,owner,expires_at)
 values(lease_name,lease_owner,now() + make_interval(secs => least(ttl_seconds,600)))
 on conflict(name) do update set owner=excluded.owner,expires_at=excluded.expires_at
 where public.deuce_sync_lease.expires_at < now()
 returning name
 ) select exists(select 1 from acquired);
$$;
revoke all on function public.deuce_acquire_lease(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.deuce_acquire_lease(text,uuid,integer) to service_role;
