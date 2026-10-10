-- A deliberately small, read-only database call for the scheduled keepalive.
create or replace function public.keepalive()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

comment on function public.keepalive() is
  'Read-only health check used by the scheduled project keepalive.';
