begin;

-- Supabase Auth is reserved for privileged administrators, but the project
-- supports more than one active master admin for continuity and handover.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (auth_user_id, role, full_name, is_active)
  values (
    new.id,
    'master_admin',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    true
  );

  return new;
end;
$$;

commit;
