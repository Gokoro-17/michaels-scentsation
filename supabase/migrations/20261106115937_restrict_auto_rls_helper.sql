-- New Supabase projects may include an automatic RLS event trigger in public.
-- Keep the trigger active, but do not expose its SECURITY DEFINER helper to
-- browser roles. The conditional also supports projects without this helper.
do $hardening$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end
$hardening$;
