begin;

-- Preserve every existing application profile and transaction actor while
-- severing the legacy one-to-one dependency on Supabase Auth.
alter table public.profiles
  add column auth_user_id uuid unique references auth.users(id) on delete restrict;

update public.profiles p
set auth_user_id = p.id
where exists (select 1 from auth.users u where u.id = p.id);

do $$
begin
  if exists (select 1 from auth.users)
     and not exists (
    select 1
    from public.profiles
    where role = 'master_admin'
      and is_active
      and auth_user_id is not null
  ) then
    raise exception 'Migration requires at least one active master admin linked to Supabase Auth';
  end if;
end;
$$;

alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

create table public.local_user_accounts (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  username text not null check (username = btrim(username) and char_length(username) between 3 and 150),
  password_hash text,
  password_updated_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index local_user_accounts_username_lower_unique_idx
  on public.local_user_accounts (lower(username));

create trigger local_user_accounts_set_updated_at
before update on public.local_user_accounts
for each row execute function public.set_updated_at();

create table public.local_auth_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  ip_address inet
);

create index local_auth_sessions_active_profile_idx
  on public.local_auth_sessions (profile_id, expires_at desc)
  where revoked_at is null;

alter table public.local_user_accounts enable row level security;
alter table public.local_auth_sessions enable row level security;

revoke all on public.local_user_accounts, public.local_auth_sessions from anon, authenticated;
grant select, insert, update, delete on public.local_user_accounts, public.local_auth_sessions to service_role;

-- Existing non-admin Auth users become local accounts. Passwords are set to
-- NULL intentionally: Supabase password hashes are not portable and must not
-- be copied. Master admin sets a new password before the user can log in.
insert into public.local_user_accounts (profile_id, username, password_hash)
select
  p.id,
  coalesce(nullif(lower(btrim(u.email)), ''), 'akun-' || replace(p.id::text, '-', '')),
  null
from public.profiles p
join auth.users u on u.id = p.auth_user_id
where p.role <> 'master_admin'
on conflict (profile_id) do nothing;

update public.profiles
set must_change_password = true,
    updated_at = now()
where role <> 'master_admin';

create or replace function public.enforce_profile_auth_source()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.role = 'master_admin' and new.auth_user_id is null then
    raise exception 'Master admin must be backed by Supabase Auth';
  end if;

  if new.role <> 'master_admin' and new.auth_user_id is not null then
    raise exception 'Only master admin may be backed by Supabase Auth';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_auth_source
before insert or update of role, auth_user_id on public.profiles
for each row execute function public.enforce_profile_auth_source();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.is_active = true
        and (p.auth_user_id = (select auth.uid()) or p.id = (select auth.uid()))
      order by (p.auth_user_id = (select auth.uid())) desc
      limit 1
    ),
    'guest'::public.app_role
  );
$$;

-- Auth may retain only master-admin identities. Profiles remain so that audit
-- trails and transaction foreign keys keep their original actor IDs.
update public.profiles
set auth_user_id = null,
    updated_at = now()
where role <> 'master_admin';

delete from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.auth_user_id = u.id
    and p.role = 'master_admin'
    and p.is_active
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if exists (
    select 1
    from public.profiles
    where role = 'master_admin'
      and is_active
      and auth_user_id is not null
  ) then
    raise exception 'Supabase Auth is reserved for an existing master admin account';
  end if;

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

create or replace function public.bootstrap_master_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(btrim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user with email % was not found', p_email;
  end if;

  select id into v_profile_id
  from public.profiles
  where auth_user_id = v_user_id
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (auth_user_id, role, full_name, is_active)
    values (v_user_id, 'master_admin', split_part(coalesce(p_email, ''), '@', 1), true)
    returning id into v_profile_id;
  else
    update public.profiles
    set role = 'master_admin', is_active = true, updated_at = now()
    where id = v_profile_id;
  end if;

  return v_profile_id;
end;
$$;

revoke all on function public.enforce_profile_auth_source() from public, anon, authenticated;
revoke all on function public.bootstrap_master_admin(text) from public, anon, authenticated;

commit;
