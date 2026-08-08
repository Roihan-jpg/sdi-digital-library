alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create or replace function public.is_library_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() = 'librarian';
$$;

create or replace function public.is_library_operator()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() = 'librarian';
$$;

create or replace function public.can_view_operations()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() in ('head_librarian', 'librarian');
$$;

create or replace function public.can_link_member_account()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() in ('master_admin', 'librarian');
$$;

drop policy if exists profiles_select_own_or_management on public.profiles;
create policy profiles_select_own_or_management
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_master_admin()
  or public.can_view_operations()
);

drop policy if exists profiles_master_admin_delete on public.profiles;
drop policy if exists members_master_delete on public.members;
create policy members_staff_delete
on public.members
for delete
to authenticated
using (public.is_library_operator());

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be changed';
  end if;

  if session_user not in ('postgres', 'supabase_admin')
     and not public.is_service_role() then
    if new.must_change_password is distinct from old.must_change_password then
      raise exception 'Password change state can only be managed by the backend';
    end if;

    if new.role is distinct from old.role then
      if old.id = (select auth.uid()) then
        raise exception 'You cannot change your own role';
      end if;

      if old.role = 'master_admin'
         and old.is_active
         and not exists (
           select 1
           from public.profiles p
           where p.id <> old.id
             and p.role = 'master_admin'
             and p.is_active
         ) then
        raise exception 'At least one active master admin is required';
      end if;

      if not public.is_master_admin()
         and not (
           public.is_library_operator()
           and old.role = 'guest'
           and new.role = 'member'
         ) then
        raise exception 'Only master admin can change user roles';
      end if;
    end if;

    if new.is_active is distinct from old.is_active then
      if old.id = (select auth.uid()) then
        raise exception 'You cannot change your own account activation';
      end if;

      if old.role = 'master_admin'
         and old.is_active
         and not new.is_active
         and not exists (
           select 1
           from public.profiles p
           where p.id <> old.id
             and p.role = 'master_admin'
             and p.is_active
         ) then
        raise exception 'At least one active master admin is required';
      end if;

      if not public.is_master_admin() then
        raise exception 'Only master admin can change account activation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.link_member_account(
  p_member_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.can_link_member_account() then
    raise exception 'Only master admin or librarian can link member accounts';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and is_active = true
  ) then
    raise exception 'Active user profile not found';
  end if;

  if exists (
    select 1 from public.members
    where user_id = p_user_id and id <> p_member_id
  ) then
    raise exception 'User account is already linked to another member';
  end if;

  update public.members
  set user_id = p_user_id,
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;

  update public.profiles
  set role = case
      when role = 'guest' then 'member'::public.app_role
      else role
    end,
    updated_at = now()
  where id = p_user_id;
end;
$$;

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
after insert or update or delete on public.profiles
for each row execute function public.write_audit_log();

create table public.system_events (
  id bigint generated always as identity primary key,
  level text not null check (level in ('warning', 'error')),
  source text not null check (source in ('backend', 'auth', 'database', 'storage', 'maintenance')),
  event_code text not null check (event_code ~ '^[A-Z][A-Z0-9_]{2,80}$'),
  message text not null check (char_length(message) between 1 and 500),
  request_id text,
  actor_user_id uuid references public.profiles(id) on delete set null,
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index system_events_occurred_at_idx
  on public.system_events (occurred_at desc);
create index system_events_level_source_idx
  on public.system_events (level, source, occurred_at desc);
create index system_events_expires_at_idx
  on public.system_events (expires_at);

alter table public.system_events enable row level security;

create policy system_events_master_select
on public.system_events
for select
to authenticated
using ((select public.is_master_admin()));

revoke all on table public.system_events from anon, authenticated;
grant select on table public.system_events to authenticated;
grant select, insert, delete on table public.system_events to service_role;
revoke all on sequence public.system_events_id_seq from anon, authenticated;
grant usage, select on sequence public.system_events_id_seq to service_role;

create or replace function public.purge_expired_system_events()
returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted bigint;
begin
  delete from public.system_events
  where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.is_library_operator() from public, anon;
revoke execute on function public.can_link_member_account() from public, anon;
revoke execute on function public.purge_expired_system_events() from public, anon, authenticated;
grant execute on function public.is_library_operator() to authenticated, service_role;
grant execute on function public.can_link_member_account() to authenticated, service_role;
grant execute on function public.purge_expired_system_events() to service_role;

update public.profiles p
set role = 'guest',
    is_active = false,
    updated_at = now()
from auth.users u
where p.id = u.id
  and p.id = '10000000-0000-4000-8000-000000000001'::uuid
  and lower(u.email) = 'admin.dummy@sdi.test'
  and p.role = 'master_admin'
  and exists (
    select 1
    from public.profiles other
    where other.id <> p.id
      and other.role = 'master_admin'
      and other.is_active
  );
