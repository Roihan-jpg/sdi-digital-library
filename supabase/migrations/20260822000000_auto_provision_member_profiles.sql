begin;

create or replace function public.provision_member_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role <> 'member' then
    return new;
  end if;

  if exists (
    select 1
    from public.members
    where user_id = new.id
  ) then
    return new;
  end if;

  insert into public.members (
    user_id,
    member_code,
    card_number,
    is_student,
    full_name,
    gender,
    is_active,
    notes
  ) values (
    new.id,
    'AUTO-MEMBER-' || new.id::text,
    'AUTO-CARD-' || new.id::text,
    false,
    coalesce(nullif(btrim(new.full_name), ''), 'Member'),
    'unknown',
    true,
    'Dibuat otomatis dari akun ber-role member. Lengkapi data siswa bila diperlukan.'
  );

  return new;
end;
$$;

drop trigger if exists profiles_auto_provision_member on public.profiles;
create trigger profiles_auto_provision_member
after insert or update of role on public.profiles
for each row
when (new.role = 'member')
execute function public.provision_member_for_profile();

insert into public.members (
  user_id,
  member_code,
  card_number,
  is_student,
  full_name,
  gender,
  is_active,
  notes
)
select
  p.id,
  'AUTO-MEMBER-' || p.id::text,
  'AUTO-CARD-' || p.id::text,
  false,
  coalesce(nullif(btrim(p.full_name), ''), 'Member'),
  'unknown',
  true,
  'Dibuat otomatis dari akun ber-role member. Lengkapi data siswa bila diperlukan.'
from public.profiles p
where p.role = 'member'
  and not exists (
    select 1
    from public.members m
    where m.user_id = p.id
  );

revoke all on function public.provision_member_for_profile() from public, anon, authenticated;

commit;
