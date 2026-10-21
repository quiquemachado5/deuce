-- Reviewed against public policies/functions on project rmiltvmwdmfqzuoipfqs.
-- No data rows, service_role permissions or public SELECT policies are removed.
alter view public.rankings_current set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger on
  public.rankings_current, public.rankings, public.live_matches, public.historical_champions
  from public, anon, authenticated;
revoke all on public.provider_state, public.social_control, public.social_outbox,
  public.social_match_state, public.deuce_archive_objects, public.deuce_sync_lease
  from public, anon, authenticated;
alter function public.provider_release_lease(text) set search_path = '';
alter function public.provider_spend(text, integer) set search_path = '';
alter function public.provider_try_lease(text, integer) set search_path = '';
alter function public.social_claim_next() set search_path = '';
revoke execute on function public.provider_release_lease(text),
  public.provider_spend(text, integer), public.provider_try_lease(text, integer),
  public.social_claim_next() from public, anon, authenticated;
grant execute on function public.provider_release_lease(text),
  public.provider_spend(text, integer), public.provider_try_lease(text, integer),
  public.social_claim_next() to service_role;
