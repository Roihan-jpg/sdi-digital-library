create or replace function public.record_digital_access(
  p_collection_id uuid,
  p_action public.digital_action_type
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_downloadable boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select dc.is_downloadable
  into v_downloadable
  from public.digital_collections dc
  where dc.id = p_collection_id
    and dc.is_published = true;

  if not found then
    raise exception using errcode = 'P0002', message = 'digital_collection_not_found';
  end if;

  if p_action = 'download' and not v_downloadable then
    raise exception using errcode = '42501', message = 'download_not_allowed';
  end if;

  if exists (
    select 1
    from public.digital_access_logs dal
    where dal.digital_collection_id = p_collection_id
      and dal.user_id = v_user_id
      and dal.action = p_action
      and dal.created_at >= now() - interval '5 minutes'
  ) then
    return false;
  end if;

  insert into public.digital_access_logs (
    digital_collection_id,
    user_id,
    action
  ) values (
    p_collection_id,
    v_user_id,
    p_action
  );

  return true;
end;
$$;

revoke all on function public.record_digital_access(uuid, public.digital_action_type)
from public, anon;
grant execute on function public.record_digital_access(uuid, public.digital_action_type)
to authenticated, service_role;
