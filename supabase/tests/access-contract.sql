-- Read-only assertions: tested against the production project after hardening.
-- A failure aborts; no business rows are inserted, updated, or deleted.
do $$
begin
  set local role anon;
  perform count(*) from public.rankings_current;
  if has_table_privilege('anon','public.rankings','INSERT')
     or has_table_privilege('anon','public.social_outbox','TRUNCATE')
     or has_function_privilege('anon','public.provider_spend(text,integer)','EXECUTE') then
    raise exception 'Unexpected anonymous mutation permission';
  end if;
  reset role;
  set local role authenticated;
  perform count(*) from public.rankings_current;
  if has_function_privilege('authenticated','public.social_claim_next()','EXECUTE') then
    raise exception 'Unexpected authenticated RPC permission';
  end if;
  reset role;
  set local role service_role;
  perform count(*) from public.deuce_archive_objects;
  if not has_table_privilege('service_role','public.deuce_archive_objects','INSERT') then
    raise exception 'Server archive writer lost its permission';
  end if;
  reset role;
end $$;
