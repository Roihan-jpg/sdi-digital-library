-- ROLLBACK DATA DUMMY SINTETIS.
-- Jalankan hanya bila ingin menghapus data yang dibuat oleh:
--   supabase/demo/seed_full_dummy.sql
--
-- Script ini sengaja menargetkan data berprefix/UUID DUMMY saja.
-- Tidak menghapus data asli sekolah.

begin;

set local statement_timeout = '0';
set local lock_timeout = '10s';
set local search_path = public, auth, extensions, pg_temp;

-- ---------------------------------------------------------------------------
-- 1. Child tables transaksi dan log.
-- ---------------------------------------------------------------------------

delete from public.fine_payments
where id::text like '86000000-%'
   or reference_number like 'DUMMY-%'
   or notes ilike '%dummy%';

delete from public.fines
where id::text like '85000000-%'
   or description ilike '%dummy%';

delete from public.loan_extensions
where id::text like '84000000-%'
   or reason ilike '%dummy%';

delete from public.loan_items
where id::text like '83000000-%'
   or notes ilike '%dummy%';

delete from public.loans
where id::text like '81000000-%'
   or loan_number like 'DUMMY-%'
   or notes ilike '%dummy%';

delete from public.reservations
where id::text like '80000000-%'
   or reservation_number like 'DUMMY-%'
   or notes ilike '%dummy%';

delete from public.visits
where id::text like '87000000-%'
   or notes ilike '%dummy%'
   or card_number_snapshot like 'DUMMY-%';

delete from public.group_visits
where id::text like '88000000-%'
   or teacher_name ilike '%dummy%'
   or notes ilike '%dummy%';

delete from public.import_errors ie
using public.import_jobs ij
where ij.id = ie.import_job_id
  and (ij.id::text like '89000000-%' or ij.file_name like 'dummy-%');

delete from public.import_jobs
where id::text like '89000000-%'
   or file_name like 'dummy-%'
   or file_path like 'imports/dummy-%';

delete from public.digital_access_logs dal
using public.digital_collections dc
where dc.id = dal.digital_collection_id
  and (dc.id::text like '70000000-%' or dc.slug like 'dummy-%');

delete from public.digital_collections
where id::text like '70000000-%'
   or slug like 'dummy-%'
   or file_path like 'digital/dummy/%';

-- ---------------------------------------------------------------------------
-- 2. Katalog fisik.
-- ---------------------------------------------------------------------------

-- Seed dummy pernah menempelkan sebagian master dummy ke data katalog lain.
-- Lepaskan referensinya agar data katalog non-dummy tetap aman.
update public.book_titles bt
set publisher_id = null
from public.publishers p
where p.id = bt.publisher_id
  and (p.id::text like '42000000-%' or p.name like 'Penerbit Dummy %');

update public.book_titles bt
set default_shelf_id = null
from public.shelves s
where s.id = bt.default_shelf_id
  and (s.id::text like '43000000-%' or s.code like 'DUMMY-%');

update public.book_copies bc
set shelf_id = null
from public.shelves s
where s.id = bc.shelf_id
  and (s.id::text like '43000000-%' or s.code like 'DUMMY-%');

update public.book_titles bt
set replacement_cost_category_id = null
from public.replacement_cost_categories rcc
where rcc.id = bt.replacement_cost_category_id
  and (rcc.id::text like '44000000-%' or rcc.name like 'DUMMY%');

delete from public.book_authors ba
using public.book_titles bt
where bt.id = ba.book_title_id
  and (bt.id::text like '50000000-%' or bt.catalog_code like 'DUMMY-%');

delete from public.book_authors ba
using public.authors a
where a.id = ba.author_id
  and (a.id::text like '41000000-%' or a.name like 'Penulis Dummy %');

delete from public.book_copies
where id::text like '60000000-%'
   or inventory_code like 'DUMMY-%'
   or notes ilike '%dummy%';

delete from public.book_titles
where id::text like '50000000-%'
   or catalog_code like 'DUMMY-%'
   or title like 'Buku Dummy %';

delete from public.replacement_cost_categories
where id::text like '44000000-%'
   or name like 'DUMMY%';

delete from public.shelves
where id::text like '43000000-%'
   or code like 'DUMMY-%'
   or name like 'Rak Dummy %';

delete from public.publishers
where id::text like '42000000-%'
   or name like 'Penerbit Dummy %';

delete from public.authors
where id::text like '41000000-%'
   or name like 'Penulis Dummy %';

delete from public.categories
where id::text like '40000000-%'
   or slug like 'dummy-%'
   or name like 'DUMMY%';

-- ---------------------------------------------------------------------------
-- 3. Member dan master sekolah.
-- ---------------------------------------------------------------------------

delete from public.members
where id::text like '30000000-%'
   or member_code like 'DUMMY-%'
   or card_number like 'DUMMY-%'
   or student_card_number like 'DUMMY-%'
   or email like '%.dummy@sdi.test'
   or notes ilike '%dummy%';

delete from public.study_groups
where id::text like '20000000-0000-4000-8000-0000000002%'
   or name like 'DUMMY %'
   or homeroom_teacher_name like 'Guru DUMMY%';

delete from public.classes
where id::text like '20000000-0000-4000-8000-0000000001%'
   or name like 'DUMMY Kelas %';

delete from public.school_years
where id = '20000000-0000-4000-8000-000000000001'
   or name = 'DUMMY 2026/2027';

-- ---------------------------------------------------------------------------
-- 4. Setting yang pernah diisi seed.
-- ---------------------------------------------------------------------------

update public.library_settings
set
  school_email = nullif(school_email, 'perpustakaan@sdi.test'),
  updated_by = case
    when updated_by::text like '10000000-%' then null
    else updated_by
  end,
  updated_at = now()
where id = 1
  and (
    school_email = 'perpustakaan@sdi.test'
    or updated_by::text like '10000000-%'
  );

-- ---------------------------------------------------------------------------
-- 5. Profiles dan akun Auth dummy.
-- ---------------------------------------------------------------------------

-- Model autentikasi baru menyimpan akun non-master di tabel lokal.
delete from public.local_auth_sessions las
using public.profiles p
where p.id = las.profile_id
  and (
    p.id::text like '10000000-%'
    or p.id::text like 'd0000000-%'
    or p.full_name ilike '%dummy%'
    or p.full_name ilike '%demo%'
  );

delete from public.profiles
where id::text like '10000000-%'
   or id::text like 'd0000000-%'
   or full_name ilike '%dummy%'
   or full_name ilike '%demo%';

delete from public.local_user_accounts lua
using public.profiles p
where p.id = lua.profile_id
  and (
    p.id::text like '10000000-%'
    or p.id::text like 'd0000000-%'
    or p.full_name ilike '%dummy%'
    or p.full_name ilike '%demo%'
  );

delete from auth.identities
where user_id::text like '10000000-%'
   or identity_data ->> 'email' like '%.dummy@sdi.test';

delete from auth.users
where id::text like '10000000-%'
   or email like '%.dummy@sdi.test';

-- ---------------------------------------------------------------------------
-- 6. Audit/log sisa yang dibuat saat seed atau rollback dummy.
-- ---------------------------------------------------------------------------

delete from public.audit_logs
where record_id like '10000000-%'
   or record_id like '20000000-%'
   or record_id like '30000000-%'
   or record_id like '40000000-%'
   or record_id like '41000000-%'
   or record_id like '42000000-%'
   or record_id like '43000000-%'
   or record_id like '44000000-%'
   or record_id like '50000000-%'
   or record_id like '60000000-%'
   or record_id like '70000000-%'
   or record_id like '80000000-%'
   or record_id like '81000000-%'
   or record_id like '83000000-%'
   or record_id like '84000000-%'
   or record_id like '85000000-%'
   or record_id like '86000000-%'
   or record_id like '87000000-%'
   or record_id like '88000000-%'
   or record_id like '89000000-%'
   or coalesce(old_data::text, '') ilike '%dummy%'
   or coalesce(new_data::text, '') ilike '%dummy%';

commit;
