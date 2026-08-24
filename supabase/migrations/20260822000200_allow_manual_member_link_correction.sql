begin;

drop function if exists public.link_member_account(uuid, uuid);

create function public.link_member_account(
  p_actor_profile_id uuid,
  p_member_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_target_role public.app_role;
  v_current_member_id uuid;
  v_current_member_code text;
  v_candidate_owner_id uuid;
begin
  if not public.is_service_role() then
    raise exception 'Member linking is only available through the application service';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_actor_profile_id
      and is_active = true
      and role in ('master_admin', 'librarian')
  ) then
    raise exception 'Only master admin or librarian can link member accounts';
  end if;

  select role
  into v_target_role
  from public.profiles
  where id = p_user_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active user profile not found';
  end if;

  if v_target_role not in ('member', 'guest') then
    raise exception 'Only member or guest profiles can be linked to a member record';
  end if;

  select id, member_code
  into v_current_member_id, v_current_member_code
  from public.members
  where user_id = p_user_id
  for update;

  select user_id
  into v_candidate_owner_id
  from public.members
  where id = p_member_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active member not found';
  end if;

  if v_candidate_owner_id is not null and v_candidate_owner_id <> p_user_id then
    raise exception 'Member is already linked to another user account';
  end if;

  if v_current_member_id is not null and v_current_member_id <> p_member_id then
    if v_current_member_code not like 'AUTO-MEMBER-%' then
      raise exception 'User account is already linked to a permanent member record';
    end if;

    if exists (select 1 from public.reservations where member_id = v_current_member_id)
      or exists (select 1 from public.loans where member_id = v_current_member_id)
      or exists (select 1 from public.fines where member_id = v_current_member_id)
      or exists (select 1 from public.visits where member_id = v_current_member_id) then
      raise exception 'Provisional member record has transaction history and cannot be replaced';
    end if;

    delete from public.members
    where id = v_current_member_id;
  end if;

  update public.members
  set user_id = p_user_id,
      updated_at = now()
  where id = p_member_id;

  if v_target_role = 'guest' then
    update public.profiles
    set role = 'member',
        updated_at = now()
    where id = p_user_id;
  end if;

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id
  ) values (
    'members',
    p_member_id::text,
    'MEMBER_LINKED_TO_PROFILE',
    jsonb_build_object('replaced_provisional_member_id', v_current_member_id),
    jsonb_build_object('profile_id', p_user_id),
    p_actor_profile_id
  );
end;
$$;

revoke all on function public.link_member_account(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.link_member_account(uuid, uuid, uuid) to service_role;

commit;
