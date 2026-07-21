-- Force private digital file access through the backend signed-URL flow.
drop policy if exists digital_library_authenticated_read on storage.objects;
drop policy if exists digital_library_staff_insert on storage.objects;
drop policy if exists digital_library_staff_update on storage.objects;
drop policy if exists digital_library_staff_delete on storage.objects;
drop policy if exists covers_staff_insert on storage.objects;
drop policy if exists covers_staff_update on storage.objects;
drop policy if exists covers_staff_delete on storage.objects;
drop policy if exists imports_staff_read on storage.objects;
drop policy if exists imports_staff_insert on storage.objects;
drop policy if exists imports_staff_update on storage.objects;
drop policy if exists imports_staff_delete on storage.objects;
drop policy if exists exports_management_read on storage.objects;
drop policy if exists exports_staff_insert on storage.objects;
drop policy if exists exports_staff_update on storage.objects;
drop policy if exists exports_staff_delete on storage.objects;
drop policy if exists covers_public_read on storage.objects;

update storage.buckets
set file_size_limit = case id
  when 'covers' then 5 * 1024 * 1024
  when 'digital-library' then 100 * 1024 * 1024
  when 'imports' then 10 * 1024 * 1024
  when 'exports' then 50 * 1024 * 1024
  else file_size_limit
end
where id in ('covers', 'digital-library', 'imports', 'exports');

revoke select on public.digital_collections from authenticated;
grant select (
  id,
  category_id,
  title,
  slug,
  description,
  media_type,
  author_text,
  publisher_text,
  publication_year,
  cover_path,
  mime_type,
  file_size_bytes,
  duration_seconds,
  is_downloadable,
  is_published,
  published_at,
  created_at,
  updated_at
) on public.digital_collections to authenticated;

-- Security-definer helpers that expose internal calculations are implementation
-- details, not public RPC endpoints. Role helpers retain only the grants needed
-- by RLS policies.
revoke execute on function public.calculate_overdue_days(timestamptz, timestamptz)
from public, anon, authenticated, service_role;
revoke execute on function public.calculate_replacement_charge(uuid, public.fine_type)
from public, anon, authenticated, service_role;
revoke execute on function public.is_service_role()
from public, anon, authenticated, service_role;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;

revoke execute on function public.current_app_role()
from public, anon, authenticated, service_role;
grant execute on function public.current_app_role()
to anon, authenticated, service_role;

revoke execute on function public.can_view_operations()
from public, anon, authenticated, service_role;
grant execute on function public.can_view_operations()
to anon, authenticated, service_role;

revoke execute on function public.is_library_staff()
from public, anon, authenticated, service_role;
grant execute on function public.is_library_staff()
to authenticated, service_role;

revoke execute on function public.is_master_admin()
from public, anon, authenticated, service_role;
grant execute on function public.is_master_admin()
to authenticated, service_role;

-- Operational state transitions are available only through the transactional
-- SECURITY DEFINER RPCs. Browser roles retain their existing SELECT policies.
drop policy if exists reservations_staff_insert on public.reservations;
drop policy if exists reservations_staff_update on public.reservations;
drop policy if exists reservations_staff_delete on public.reservations;
drop policy if exists loans_staff_insert on public.loans;
drop policy if exists loans_staff_update on public.loans;
drop policy if exists loans_staff_delete on public.loans;
drop policy if exists loan_items_staff_insert on public.loan_items;
drop policy if exists loan_items_staff_update on public.loan_items;
drop policy if exists loan_items_staff_delete on public.loan_items;
drop policy if exists loan_extensions_staff_insert on public.loan_extensions;
drop policy if exists loan_extensions_staff_update on public.loan_extensions;
drop policy if exists loan_extensions_staff_delete on public.loan_extensions;
drop policy if exists fines_staff_insert on public.fines;
drop policy if exists fines_staff_update on public.fines;
drop policy if exists fines_staff_delete on public.fines;
drop policy if exists fine_payments_staff_insert on public.fine_payments;
drop policy if exists fine_payments_staff_update on public.fine_payments;
drop policy if exists fine_payments_staff_delete on public.fine_payments;
drop policy if exists visits_staff_insert on public.visits;
drop policy if exists visits_staff_update on public.visits;
drop policy if exists visits_staff_delete on public.visits;
drop policy if exists group_visits_staff_insert on public.group_visits;
drop policy if exists group_visits_staff_update on public.group_visits;
drop policy if exists group_visits_staff_delete on public.group_visits;
drop policy if exists digital_access_logs_insert_own on public.digital_access_logs;

alter table public.loans
add column checkout_idempotency_key uuid,
add column checkout_request_hash text;

create unique index loans_checkout_idempotency_unique_idx
on public.loans (created_by, checkout_idempotency_key)
where checkout_idempotency_key is not null;

create or replace function public.create_loan_by_codes(
  p_card_number text,
  p_inventory_codes text[],
  p_notes text,
  p_reservation_id uuid,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_existing_loan_id uuid;
  v_existing_hash text;
  v_request_hash text;
  v_loan_id uuid;
  v_normalized_codes text;
begin
  if not public.is_library_staff() then
    raise exception 'Hanya petugas perpustakaan yang dapat membuat peminjaman';
  end if;

  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key wajib diisi';
  end if;

  select string_agg(btrim(code), ',' order by btrim(code))
  into v_normalized_codes
  from unnest(p_inventory_codes) as input(code);

  v_request_hash := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          '|',
          btrim(p_card_number),
          coalesce(v_normalized_codes, ''),
          coalesce(p_reservation_id::text, ''),
          coalesce(btrim(p_notes), '')
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  select id, checkout_request_hash
  into v_existing_loan_id, v_existing_hash
  from public.loans
  where created_by = v_actor_id
    and checkout_idempotency_key = p_idempotency_key;

  if v_existing_loan_id is not null then
    if v_existing_hash is distinct from v_request_hash then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key sudah digunakan untuk permintaan berbeda';
    end if;
    return v_existing_loan_id;
  end if;

  v_loan_id := public.create_loan_by_codes(
    p_card_number,
    p_inventory_codes,
    p_notes,
    p_reservation_id
  );

  update public.loans
  set checkout_idempotency_key = p_idempotency_key,
      checkout_request_hash = v_request_hash
  where id = v_loan_id;

  return v_loan_id;
end;
$$;

revoke execute on function public.create_loan_by_codes(text, text[], text, uuid, uuid)
from public, anon;
grant execute on function public.create_loan_by_codes(text, text[], text, uuid, uuid)
to authenticated;
