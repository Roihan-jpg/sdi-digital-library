-- Complete the operational RPC surface used by Prompt 4.
-- This migration mirrors the already-applied remote migration of the same version.

create or replace function public.lookup_member_by_card(p_card_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat mencari kartu member';
  end if;

  select jsonb_build_object(
    'id', m.id,
    'member_code', m.member_code,
    'card_number', m.card_number,
    'full_name', m.full_name,
    'is_active', m.is_active and (m.expires_at is null or m.expires_at >= current_date),
    'expires_at', m.expires_at,
    'class_name', c.name,
    'study_group_name', sg.name,
    'active_loan_count', (
      select count(*)
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      where l.member_id = m.id
        and li.returned_at is null
        and li.status in ('borrowed', 'overdue')
    ),
    'outstanding_fine', (
      select coalesce(sum(f.amount - f.paid_amount), 0)
      from public.fines f
      where f.member_id = m.id
        and f.status in ('unpaid', 'partial')
    )
  )
  into v_result
  from public.members m
  left join public.classes c on c.id = m.class_id
  left join public.study_groups sg on sg.id = m.study_group_id
  where m.card_number = trim(p_card_number)
     or m.member_code = trim(p_card_number)
     or m.student_card_number = trim(p_card_number)
  order by case when m.card_number = trim(p_card_number) then 0 else 1 end
  limit 1;

  if v_result is null then
    raise exception 'Kartu atau kode member tidak ditemukan';
  end if;
  return v_result;
end;
$$;

create or replace function public.lookup_book_copy_by_code(p_inventory_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat mencari eksemplar';
  end if;

  select jsonb_build_object(
    'id', bc.id,
    'inventory_code', bc.inventory_code,
    'title_id', bt.id,
    'title', bt.title,
    'status', bc.status,
    'condition', bc.condition,
    'is_active', bc.is_active,
    'is_reference_only', bt.is_reference_only,
    'active_loan_item_id', li.id,
    'due_at', li.due_at,
    'member_name', m.full_name,
    'member_code', m.member_code
  )
  into v_result
  from public.book_copies bc
  join public.book_titles bt on bt.id = bc.book_title_id
  left join public.loan_items li
    on li.book_copy_id = bc.id
   and li.returned_at is null
   and li.status in ('borrowed', 'overdue')
  left join public.loans l on l.id = li.loan_id
  left join public.members m on m.id = l.member_id
  where bc.inventory_code = trim(p_inventory_code)
     or bc.barcode_value = trim(p_inventory_code)
     or bc.qr_value = trim(p_inventory_code)
  order by case when bc.inventory_code = trim(p_inventory_code) then 0 else 1 end
  limit 1;

  if v_result is null then
    raise exception 'Kode inventaris/barcode tidak ditemukan';
  end if;
  return v_result;
end;
$$;

create or replace function public.approve_reservation(
  p_reservation_id uuid,
  p_inventory_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_copy public.book_copies%rowtype;
  v_settings public.library_settings%rowtype;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat menyetujui reservasi';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reservasi tidak ditemukan';
  end if;
  if v_reservation.status <> 'pending' then
    raise exception 'Hanya reservasi pending yang dapat disetujui';
  end if;
  if v_reservation.expires_at <= now() then
    raise exception 'Reservasi sudah kedaluwarsa; jalankan maintenance';
  end if;

  if nullif(trim(p_inventory_code), '') is not null then
    select bc.* into v_copy
    from public.book_copies bc
    where bc.inventory_code = trim(p_inventory_code)
      and bc.book_title_id = v_reservation.book_title_id
      and bc.status = 'available'
      and bc.is_active
    for update;
  else
    select bc.* into v_copy
    from public.book_copies bc
    where bc.book_title_id = v_reservation.book_title_id
      and bc.status = 'available'
      and bc.is_active
    order by bc.inventory_code
    for update skip locked
    limit 1;
  end if;

  if v_copy.id is null then
    raise exception 'Tidak ada eksemplar tersedia untuk judul ini';
  end if;

  select * into v_settings from public.library_settings where id = 1;

  update public.book_copies
  set status = 'reserved', updated_at = now()
  where id = v_copy.id;

  update public.reservations
  set status = 'approved',
      assigned_copy_id = v_copy.id,
      approved_at = now(),
      approved_by = (select auth.uid()),
      expires_at = now() + make_interval(hours => v_settings.reservation_hold_hours),
      updated_at = now()
  where id = p_reservation_id;

  return jsonb_build_object(
    'reservation_id', p_reservation_id,
    'status', 'approved',
    'copy_id', v_copy.id,
    'inventory_code', v_copy.inventory_code,
    'expires_at', now() + make_interval(hours => v_settings.reservation_hold_hours)
  );
end;
$$;

create or replace function public.reject_reservation(p_reservation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat menolak reservasi';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Alasan penolakan wajib diisi';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then raise exception 'Reservasi tidak ditemukan'; end if;
  if v_reservation.status not in ('pending', 'approved') then
    raise exception 'Reservasi sudah tidak aktif';
  end if;

  if v_reservation.assigned_copy_id is not null then
    perform 1 from public.book_copies where id = v_reservation.assigned_copy_id for update;
    update public.book_copies
    set status = 'available', updated_at = now()
    where id = v_reservation.assigned_copy_id and status = 'reserved';
  end if;

  update public.reservations
  set status = 'rejected', rejected_at = now(), rejected_by = (select auth.uid()),
      rejection_reason = trim(p_reason), updated_at = now()
  where id = p_reservation_id;
end;
$$;

create or replace function public.create_loan(
  p_member_id uuid,
  p_copy_ids uuid[],
  p_notes text default null,
  p_reservation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_settings public.library_settings%rowtype;
  v_member public.members%rowtype;
  v_reservation public.reservations%rowtype;
  v_loan_id uuid;
  v_due_at timestamptz;
  v_active_count integer;
  v_requested_count integer;
  v_unique_count integer;
  v_eligible_count integer;
  v_copy_title_id uuid;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat membuat peminjaman';
  end if;

  select * into v_settings from public.library_settings where id = 1;
  select * into v_member from public.members where id = p_member_id for update;

  if v_member.id is null then raise exception 'Member tidak ditemukan'; end if;
  if not v_member.is_active
     or (v_member.expires_at is not null and v_member.expires_at < current_date) then
    raise exception 'Member tidak aktif atau masa berlakunya habis';
  end if;

  v_requested_count := cardinality(p_copy_ids);
  if v_requested_count is null or v_requested_count = 0 then
    raise exception 'Minimal satu eksemplar buku harus dipilih';
  end if;

  select count(distinct item) into v_unique_count from unnest(p_copy_ids) as t(item);
  if v_unique_count <> v_requested_count then
    raise exception 'Eksemplar buku yang sama tidak boleh dipindai lebih dari sekali';
  end if;

  select count(*) into v_active_count
  from public.loan_items li
  join public.loans l on l.id = li.loan_id
  where l.member_id = p_member_id
    and li.returned_at is null
    and li.status in ('borrowed', 'overdue');

  if v_active_count + v_requested_count > v_settings.max_active_loans then
    raise exception 'Batas peminjaman terlampaui. Aktif: %, diminta: %, maksimal: %',
      v_active_count, v_requested_count, v_settings.max_active_loans;
  end if;

  if p_reservation_id is not null then
    if v_requested_count <> 1 then
      raise exception 'Satu reservasi hanya dapat dikonversi menjadi satu item pinjaman';
    end if;

    select * into v_reservation
    from public.reservations where id = p_reservation_id for update;
    if v_reservation.id is null then raise exception 'Reservasi tidak ditemukan'; end if;
    if v_reservation.member_id <> p_member_id then raise exception 'Reservasi bukan milik member ini'; end if;
    if v_reservation.status not in ('pending', 'approved') then raise exception 'Reservasi sudah tidak aktif'; end if;
    if v_reservation.expires_at <= now() then raise exception 'Reservasi sudah kedaluwarsa'; end if;
    if v_reservation.status = 'approved'
       and v_reservation.assigned_copy_id is distinct from p_copy_ids[1] then
      raise exception 'Gunakan eksemplar yang telah dialokasikan untuk reservasi ini';
    end if;

    select bc.book_title_id into v_copy_title_id from public.book_copies bc where bc.id = p_copy_ids[1];
    if v_copy_title_id is distinct from v_reservation.book_title_id then
      raise exception 'Eksemplar tidak sesuai dengan judul yang direservasi';
    end if;
  end if;

  perform 1 from public.book_copies bc
  where bc.id = any(p_copy_ids)
  order by bc.id
  for update;

  select count(*) into v_eligible_count
  from public.book_copies bc
  join public.book_titles bt on bt.id = bc.book_title_id
  where bc.id = any(p_copy_ids)
    and bc.is_active and bt.is_active and not bt.is_reference_only
    and (
      bc.status = 'available'
      or (
        p_reservation_id is not null
        and v_reservation.status = 'approved'
        and v_reservation.assigned_copy_id = bc.id
        and bc.status = 'reserved'
      )
    );

  if v_eligible_count <> v_requested_count then
    raise exception 'Satu atau lebih eksemplar tidak tersedia untuk dipinjam';
  end if;

  v_due_at := now() + make_interval(days => v_settings.loan_period_days);

  insert into public.loans (
    loan_number, member_id, reservation_id, status, borrowed_at, created_by, notes
  ) values (
    public.next_loan_number(), p_member_id, p_reservation_id, 'active', now(), (select auth.uid()), p_notes
  ) returning id into v_loan_id;

  insert into public.loan_items (loan_id, book_copy_id, borrowed_at, due_at, status)
  select v_loan_id, bc.id, now(), v_due_at, 'borrowed'
  from public.book_copies bc where bc.id = any(p_copy_ids);

  update public.book_copies set status = 'loaned', updated_at = now() where id = any(p_copy_ids);

  if p_reservation_id is not null then
    update public.reservations
    set assigned_copy_id = p_copy_ids[1], status = 'completed',
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, (select auth.uid())),
        completed_at = now(), updated_at = now()
    where id = p_reservation_id;
  end if;

  return v_loan_id;
end;
$$;

create or replace function public.record_group_visit(
  p_class_id uuid,
  p_study_group_id uuid,
  p_teacher_name text,
  p_participant_count integer,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_library_staff() then raise exception 'Hanya petugas perpustakaan yang dapat mencatat kunjungan'; end if;
  if p_class_id is null then raise exception 'Kelas wajib dipilih'; end if;
  if nullif(trim(p_teacher_name), '') is null then raise exception 'Nama guru pendamping wajib diisi'; end if;
  if p_participant_count is null or p_participant_count <= 0 then raise exception 'Jumlah siswa harus lebih dari nol'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.is_active) then
    raise exception 'Kelas tidak aktif atau tidak ditemukan';
  end if;
  if p_study_group_id is not null and not exists (
    select 1 from public.study_groups sg
    where sg.id = p_study_group_id and sg.class_id = p_class_id and sg.is_active
  ) then raise exception 'Rombel tidak sesuai dengan kelas'; end if;

  insert into public.group_visits (
    class_id, study_group_id, teacher_name, participant_count, visited_at, recorded_by, notes
  ) values (
    p_class_id, p_study_group_id, trim(p_teacher_name), p_participant_count, now(), (select auth.uid()), p_notes
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_loan_receipt(p_loan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_library_staff() and not exists (
    select 1 from public.loans l join public.members m on m.id = l.member_id
    where l.id = p_loan_id and m.user_id = (select auth.uid())
  ) then raise exception 'Tidak berwenang melihat bukti peminjaman'; end if;

  select jsonb_build_object(
    'loan_id', l.id, 'loan_number', l.loan_number, 'borrowed_at', l.borrowed_at, 'status', l.status,
    'member', jsonb_build_object(
      'id', m.id, 'member_code', m.member_code, 'card_number', m.card_number, 'full_name', m.full_name
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'loan_item_id', li.id, 'inventory_code', bc.inventory_code, 'title', bt.title,
        'due_at', li.due_at, 'status', li.status
      ) order by bc.inventory_code)
      from public.loan_items li
      join public.book_copies bc on bc.id = li.book_copy_id
      join public.book_titles bt on bt.id = bc.book_title_id
      where li.loan_id = l.id
    ), '[]'::jsonb)
  ) into v_result
  from public.loans l join public.members m on m.id = l.member_id
  where l.id = p_loan_id;

  if v_result is null then raise exception 'Peminjaman tidak ditemukan'; end if;
  return v_result;
end;
$$;

create or replace function public.get_fine_payment_receipt(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_library_staff() and not exists (
    select 1
    from public.fine_payments fp
    join public.fines f on f.id = fp.fine_id
    join public.members m on m.id = f.member_id
    where fp.id = p_payment_id and m.user_id = (select auth.uid())
  ) then raise exception 'Tidak berwenang melihat bukti pembayaran'; end if;

  select jsonb_build_object(
    'payment_id', fp.id, 'paid_at', fp.paid_at, 'amount_paid', fp.amount,
    'method', fp.method, 'reference_number', fp.reference_number,
    'fine_id', f.id, 'fine_type', f.fine_type, 'fine_amount', f.amount,
    'total_paid', f.paid_amount, 'remaining_amount', greatest(f.amount - f.paid_amount, 0),
    'status', f.status,
    'member', jsonb_build_object('id', m.id, 'member_code', m.member_code, 'full_name', m.full_name)
  ) into v_result
  from public.fine_payments fp
  join public.fines f on f.id = fp.fine_id
  join public.members m on m.id = f.member_id
  where fp.id = p_payment_id;

  if v_result is null then raise exception 'Pembayaran tidak ditemukan'; end if;
  return v_result;
end;
$$;

create or replace function public.run_library_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_overdue integer;
  v_expired integer;
begin
  if session_user not in ('postgres', 'supabase_admin')
     and not public.is_service_role()
     and not public.is_library_staff() then
    raise exception 'Tidak berwenang menjalankan maintenance perpustakaan';
  end if;
  v_overdue := public.mark_overdue_items();
  v_expired := public.expire_reservations();
  return jsonb_build_object(
    'overdue_items_marked', v_overdue,
    'reservations_expired', v_expired,
    'ran_at', now()
  );
end;
$$;
