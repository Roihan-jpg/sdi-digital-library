begin;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'digital_library_authenticated_read'
  ) then
    raise exception 'private digital files must only be read through backend signed URLs';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  ) then
    raise exception 'browser roles must not read or mutate managed Storage objects directly';
  end if;

  if has_column_privilege('authenticated', 'public.digital_collections', 'file_path', 'select')
     or has_column_privilege('authenticated', 'public.digital_collections', 'preview_path', 'select') then
    raise exception 'authenticated clients must not read private digital object paths';
  end if;

  if has_function_privilege(
    'anon',
    'public.calculate_replacement_charge(uuid,public.fine_type)',
    'execute'
  ) then
    raise exception 'anonymous users must not execute replacement charge calculations';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null
     and (
       has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
       or has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')
     ) then
    raise exception 'browser roles must not execute the automatic RLS event-trigger helper';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'reservations', 'loans', 'loan_items', 'loan_extensions',
        'fines', 'fine_payments', 'visits', 'group_visits'
      ])
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) then
    raise exception 'critical operational tables must only be mutated through RPCs';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'digital_access_logs'
      and cmd = 'INSERT'
  ) then
    raise exception 'digital access logs must only be inserted through the throttled RPC';
  end if;
end;
$$;

rollback;
