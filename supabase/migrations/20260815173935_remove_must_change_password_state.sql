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

alter table public.profiles
  drop column if exists must_change_password;
