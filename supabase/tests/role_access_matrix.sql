begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'matrix-admin@example.test', 'not-used', now(),
    '{}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'matrix-head@example.test', 'not-used', now(),
    '{}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'matrix-librarian@example.test', 'not-used', now(),
    '{}', '{}', now(), now()
  );

update public.profiles
set role = case id
  when '61000000-0000-4000-8000-000000000001' then 'master_admin'::public.app_role
  when '61000000-0000-4000-8000-000000000002' then 'head_librarian'::public.app_role
  else 'librarian'::public.app_role
end
where id in (
  '61000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000003'
);

set local role authenticated;

set local request.jwt.claims =
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
  if public.can_view_operations() then
    raise exception 'master admin must not inherit operational read access';
  end if;
  if public.is_library_operator() then
    raise exception 'master admin must not inherit operational write access';
  end if;
  if not public.is_master_admin() then
    raise exception 'master admin account-management capability is missing';
  end if;
end;
$$;

set local request.jwt.claims =
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$
begin
  if not public.can_view_operations() then
    raise exception 'head librarian must be able to read operations';
  end if;
  if public.is_library_operator() then
    raise exception 'head librarian must not write operations';
  end if;
end;
$$;

set local request.jwt.claims =
  '{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated"}';
do $$
begin
  if not public.can_view_operations() or not public.is_library_operator() then
    raise exception 'librarian must have operational read and write access';
  end if;
end;
$$;

rollback;
