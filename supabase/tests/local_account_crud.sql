begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '72000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'crud-master@example.test', 'not-used', now(),
  '{}', '{}', now(), now()
);

do $$
declare
  actor_id uuid;
  target_id uuid;
begin
  select id into actor_id
  from public.profiles
  where auth_user_id = '72000000-0000-4000-8000-000000000001';

  insert into public.profiles (role, full_name, is_active)
  values ('librarian', 'Akun CRUD Uji', true)
  returning id into target_id;

  insert into public.local_user_accounts (profile_id, username, password_hash)
  values (target_id, 'crud.lama', null);

  perform public.update_local_user_account(
    actor_id,
    target_id,
    'crud.baru',
    'Akun CRUD Diperbarui',
    'head_librarian'
  );

  if not exists (
    select 1 from public.profiles
    where id = target_id and role = 'head_librarian' and full_name = 'Akun CRUD Diperbarui'
  ) then
    raise exception 'local account profile was not updated';
  end if;
  if not exists (
    select 1 from public.local_user_accounts
    where profile_id = target_id and username = 'crud.baru'
  ) then
    raise exception 'local account username was not updated';
  end if;

  perform public.delete_local_user_account(actor_id, target_id);
  if exists (select 1 from public.profiles where id = target_id) then
    raise exception 'local account profile was not deleted';
  end if;

  begin
    perform public.delete_local_user_account(actor_id, actor_id);
    raise exception 'master admin account must be protected';
  exception
    when others then
      if sqlstate <> 'P0001' then raise; end if;
  end;
end;
$$;

rollback;
