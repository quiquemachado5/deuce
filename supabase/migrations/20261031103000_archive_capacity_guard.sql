-- Server-only capacity telemetry for the archive relation. No payload is exposed.
create or replace function public.deuce_archive_storage_report()
returns table(
  relation_bytes bigint,
  payload_bytes bigint,
  object_count bigint,
  snapshot_count bigint,
  detail_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pg_total_relation_size('public.deuce_archive_objects'::regclass)::bigint,
    coalesce(sum(pg_column_size(payload)),0)::bigint,
    count(*)::bigint,
    count(*) filter (where key like 'reading-v2-%')::bigint,
    count(*) filter (where key like 'detail-%')::bigint
  from public.deuce_archive_objects;
$$;

revoke all on function public.deuce_archive_storage_report() from public, anon, authenticated;
grant execute on function public.deuce_archive_storage_report() to service_role;
