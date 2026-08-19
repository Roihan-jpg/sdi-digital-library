begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '71000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'master-auth@example.test', 'not-used', now(),
  '{}', '{}', now(), now()
);

do $$
declare
  v_profile_id uuid;
begin
  if not exists (
    select 1
    from public.profiles
    where auth_user_id = '71000000-0000-4000-8000-000000000001'
      and role = 'master_admin'
  ) then
    raise exception 'first Supabase Auth user must become master admin';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'second-master-auth@example.test', 'not-used', now(),
    '{}', '{}', now(), now()
  );

  if not exists (
    select 1
    from public.profiles
    where auth_user_id = '71000000-0000-4000-8000-000000000002'
      and role = 'master_admin'
  ) then
    raise exception 'additional Supabase Auth user must become master admin';
  end if;

  insert into public.profiles (role, full_name)
  values ('librarian', 'Akun Lokal Uji')
  returning id into v_profile_id;

  insert into public.local_user_accounts (profile_id, username, password_hash)
  values (v_profile_id, 'petugas.uji', null);

  if not exists (
    select 1
    from public.local_user_accounts
    where profile_id = v_profile_id
      and lower(username) = 'petugas.uji'
      and password_hash is null
  ) then
    raise exception 'local account was not created';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_profile_id and auth_user_id is not null
  ) then
    raise exception 'local account must not be linked to Supabase Auth';
  end if;
end;
$$;

rollback;
