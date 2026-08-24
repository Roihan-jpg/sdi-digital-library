begin;

do $$
declare
  direct_member_profile_id uuid := '73000000-0000-4000-8000-000000000001';
  promoted_member_profile_id uuid := '73000000-0000-4000-8000-000000000002';
  linked_member_profile_id uuid := '73000000-0000-4000-8000-000000000003';
  librarian_profile_id uuid := '73000000-0000-4000-8000-000000000004';
  manual_candidate_member_id uuid;
  direct_member_id uuid;
  direct_member_count integer;
  linked_member_count integer;
  title_id uuid := '73000000-0000-4000-8000-000000000010';
  reservation_id uuid;
begin
  insert into public.profiles (id, role, full_name, is_active)
  values (direct_member_profile_id, 'member', 'Member Otomatis', true);

  select id into direct_member_id
  from public.members
  where user_id = direct_member_profile_id;

  if direct_member_id is null then
    raise exception 'member role must receive an automatic member record';
  end if;

  if not exists (
    select 1
    from public.members
    where id = direct_member_id
      and full_name = 'Member Otomatis'
      and is_student = false
      and is_active = true
      and member_code = 'AUTO-MEMBER-' || direct_member_profile_id::text
      and card_number = 'AUTO-CARD-' || direct_member_profile_id::text
  ) then
    raise exception 'automatic member data is incomplete or not deterministic';
  end if;

  insert into public.profiles (id, role, full_name, is_active)
  values (promoted_member_profile_id, 'guest', 'Member Dipromosikan', true);
  update public.profiles set role = 'member' where id = promoted_member_profile_id;
  update public.profiles set role = 'member' where id = promoted_member_profile_id;

  select count(*) into direct_member_count
  from public.members
  where user_id = promoted_member_profile_id;
  if direct_member_count <> 1 then
    raise exception 'promoting a profile to member must create exactly one member record';
  end if;

  insert into public.profiles (id, role, full_name, is_active)
  values (linked_member_profile_id, 'guest', 'Member Sudah Terhubung', true);
  insert into public.members (user_id, member_code, card_number, is_student, full_name)
  values (
    linked_member_profile_id,
    'MANUAL-MEMBER-7303',
    'MANUAL-CARD-7303',
    false,
    'Member Sudah Terhubung'
  );
  update public.profiles set role = 'member' where id = linked_member_profile_id;

  select count(*) into linked_member_count
  from public.members
  where user_id = linked_member_profile_id;
  if linked_member_count <> 1 then
    raise exception 'a previously linked profile must not receive a duplicate member record';
  end if;

  insert into public.profiles (id, role, full_name, is_active)
  values (librarian_profile_id, 'librarian', 'Pustakawan Penghubung', true);
  insert into public.members (member_code, card_number, is_student, full_name)
  values ('MANUAL-MEMBER-7304', 'MANUAL-CARD-7304', false, 'Member Manual')
  returning id into manual_candidate_member_id;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', librarian_profile_id::text, 'role', 'service_role')::text,
    true
  );
  perform public.link_member_account(
    librarian_profile_id,
    manual_candidate_member_id,
    promoted_member_profile_id
  );

  if not exists (
    select 1
    from public.members
    where id = manual_candidate_member_id
      and user_id = promoted_member_profile_id
  ) then
    raise exception 'manual member linking must replace the provisional member record';
  end if;

  if exists (
    select 1
    from public.members
    where user_id = promoted_member_profile_id
      and member_code like 'AUTO-MEMBER-%'
  ) then
    raise exception 'provisional member record must be removed after manual linking';
  end if;

  insert into public.book_titles (id, catalog_code, title, is_active, is_published)
  values (title_id, 'AUTO-MEMBER-BOOK-7300', 'Buku Reservasi Member Otomatis', true, true);
  insert into public.book_copies (book_title_id, inventory_code, status, condition, is_active)
  values (title_id, 'AUTO-MEMBER-COPY-7300', 'available', 'good', true);

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', direct_member_profile_id::text, 'role', 'authenticated')::text,
    true
  );
  reservation_id := public.create_reservation(title_id);

  if not exists (
    select 1
    from public.reservations
    where id = reservation_id and member_id = direct_member_id and status = 'pending'
  ) then
    raise exception 'an automatically provisioned member must be able to reserve an available book';
  end if;
end;
$$;

rollback;
