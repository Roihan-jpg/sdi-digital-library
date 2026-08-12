-- Add transactional edit and delete operations for local user accounts.

begin;

create or replace function public.update_local_user_account(
  p_actor_profile_id uuid,
  p_user_id uuid,
  p_username text default null,
  p_full_name text default null,
  p_role public.app_role default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  target_profile public.profiles%rowtype;
begin
  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_profile.auth_user_id is not null then
    raise exception 'MASTER_ADMIN_ACCOUNT_PROTECTED' using errcode = 'P0001';
  end if;
  if p_username is null and p_full_name is null and p_role is null then
    raise exception 'ACCOUNT_UPDATE_EMPTY' using errcode = '22023';
  end if;
  if p_role = 'master_admin' then
    raise exception 'MASTER_ADMIN_AUTH_REQUIRED' using errcode = '22023';
  end if;

  if p_username is not null then
    update public.local_user_accounts
    set username = lower(trim(p_username)), updated_at = now()
    where profile_id = p_user_id;
    if not found then
      raise exception 'LOCAL_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  update public.profiles
  set full_name = coalesce(p_full_name, full_name),
      role = coalesce(p_role, role),
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    'local_user_accounts',
    p_user_id::text,
    'LOCAL_ACCOUNT_UPDATED',
    jsonb_build_object('full_name', target_profile.full_name, 'role', target_profile.role),
    jsonb_build_object('full_name', p_full_name, 'role', p_role, 'username_changed', p_username is not null),
    p_actor_profile_id
  );

  return p_user_id;
end;
$$;

create or replace function public.delete_local_user_account(
  p_actor_profile_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  target_profile public.profiles%rowtype;
begin
  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_profile.auth_user_id is not null or target_profile.role = 'master_admin' then
    raise exception 'MASTER_ADMIN_ACCOUNT_PROTECTED' using errcode = 'P0001';
  end if;

  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    'local_user_accounts',
    p_user_id::text,
    'LOCAL_ACCOUNT_DELETED',
    jsonb_build_object('full_name', target_profile.full_name, 'role', target_profile.role),
    null,
    p_actor_profile_id
  );

  delete from public.local_auth_sessions where profile_id = p_user_id;
  delete from public.local_user_accounts where profile_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  return p_user_id;
end;
$$;

revoke all on function public.update_local_user_account(uuid, uuid, text, text, public.app_role)
  from public, anon, authenticated;
revoke all on function public.delete_local_user_account(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.update_local_user_account(uuid, uuid, text, text, public.app_role)
  to service_role;
grant execute on function public.delete_local_user_account(uuid, uuid)
  to service_role;

commit;
