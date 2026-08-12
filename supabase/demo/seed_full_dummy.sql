-- DATA DUMMY SINTETIS - BUKAN DATA SEKOLAH NYATA.
-- Jalankan hanya pada database development/staging/testing.
-- Script ini idempoten untuk data ber-ID/prefix DUMMY miliknya sendiri.

begin;

set local statement_timeout = '0';
set local lock_timeout = '10s';
set local search_path = public, auth, extensions, pg_temp;

-- ---------------------------------------------------------------------------
-- 1. Akun Auth dan profiles untuk pengujian role.
-- Password semua akun: DemoPass123!
-- ---------------------------------------------------------------------------

with seed_users (id, email, full_name, app_role) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'admin.perpustakaan.dummy@sdi.test', 'Admin Perpustakaan Dummy', 'master_admin'::public.app_role),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'kepala.perpus.dummy@sdi.test', 'Kepala Perpustakaan Dummy', 'head_librarian'::public.app_role),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'petugas.dummy@sdi.test', 'Petugas Perpustakaan Dummy', 'librarian'::public.app_role),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'siswa.dummy@sdi.test', 'Siswa Login Dummy', 'member'::public.app_role),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'guest.dummy@sdi.test', 'Guest Dummy', 'guest'::public.app_role),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'guru.member.dummy@sdi.test', 'Guru Member Dummy', 'member'::public.app_role)
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  su.id,
  'authenticated',
  'authenticated',
  su.email,
  extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', su.full_name),
  now(),
  now(),
  false,
  false
from seed_users su
on conflict (id) do update
set
  instance_id = excluded.instance_id,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now(),
  is_sso_user = false,
  is_anonymous = false;

with seed_users (id, email, full_name) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'admin.perpustakaan.dummy@sdi.test', 'Admin Perpustakaan Dummy'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'kepala.perpus.dummy@sdi.test', 'Kepala Perpustakaan Dummy'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'petugas.dummy@sdi.test', 'Petugas Perpustakaan Dummy'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'siswa.dummy@sdi.test', 'Siswa Login Dummy'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'guest.dummy@sdi.test', 'Guest Dummy'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'guru.member.dummy@sdi.test', 'Guru Member Dummy')
)
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  su.id,
  su.id::text,
  su.id,
  jsonb_build_object(
    'sub', su.id::text,
    'email', su.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from seed_users su
on conflict (provider_id, provider) do update
set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

with seed_profiles (id, full_name, app_role) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'Admin Perpustakaan Dummy', 'master_admin'::public.app_role),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'Kepala Perpustakaan Dummy', 'head_librarian'::public.app_role),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'Petugas Perpustakaan Dummy', 'librarian'::public.app_role),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'Siswa Login Dummy', 'member'::public.app_role),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'Guest Dummy', 'guest'::public.app_role),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'Guru Member Dummy', 'member'::public.app_role)
)
insert into public.profiles (id, full_name, role, is_active)
select id, full_name, app_role, true
from seed_profiles
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Master sekolah, kelas, rombel, dan member.
-- ---------------------------------------------------------------------------

insert into public.school_years (id, name, starts_on, ends_on, is_active)
values (
  '20000000-0000-4000-8000-000000000001',
  'DUMMY 2026/2027',
  '2026-07-01',
  '2027-06-30',
  not exists (
    select 1
    from public.school_years
    where is_active = true
      and id <> '20000000-0000-4000-8000-000000000001'::uuid
  )
)
on conflict (id) do update
set
  name = excluded.name,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.classes (id, school_year_id, grade_level, name, is_active)
select
  ('20000000-0000-4000-8000-' || lpad((100 + grade)::text, 12, '0'))::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  grade,
  'DUMMY Kelas ' || grade,
  true
from generate_series(1, 6) as grade
on conflict (id) do update
set
  school_year_id = excluded.school_year_id,
  grade_level = excluded.grade_level,
  name = excluded.name,
  is_active = true,
  updated_at = now();

with groups as (
  select
    row_number() over (order by grade, group_name) as rn,
    grade,
    group_name
  from generate_series(1, 6) as grade
  cross join (values ('A'), ('B')) as g(group_name)
)
insert into public.study_groups (id, class_id, name, homeroom_teacher_name, is_active)
select
  ('20000000-0000-4000-8000-' || lpad((200 + rn)::text, 12, '0'))::uuid,
  ('20000000-0000-4000-8000-' || lpad((100 + grade)::text, 12, '0'))::uuid,
  'DUMMY ' || group_name,
  'Guru DUMMY Kelas ' || grade || group_name,
  true
from groups
on conflict (id) do update
set
  class_id = excluded.class_id,
  name = excluded.name,
  homeroom_teacher_name = excluded.homeroom_teacher_name,
  is_active = true,
  updated_at = now();

with generated_members as (
  select
    n,
    ((n - 1) % 6) + 1 as grade,
    case when ((n - 1) / 6)::integer % 2 = 0 then 'DUMMY A' else 'DUMMY B' end as group_name
  from generate_series(1, 592) as n
)
insert into public.members (
  id,
  user_id,
  member_code,
  card_number,
  student_card_number,
  is_student,
  nis,
  nisn,
  full_name,
  gender,
  class_id,
  study_group_id,
  phone,
  email,
  joined_at,
  expires_at,
  is_active,
  notes,
  created_by
)
select
  ('30000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  case when n = 1 then '10000000-0000-4000-8000-000000000004'::uuid else null end,
  'DUMMY-SIS-' || lpad(n::text, 4, '0'),
  'DUMMY-LIB-' || lpad(n::text, 4, '0'),
  'DUMMY-KP-' || lpad(n::text, 4, '0'),
  true,
  '26' || lpad(n::text, 4, '0'),
  '999000' || lpad(n::text, 4, '0'),
  case when n = 1 then 'Siswa Login Dummy' else 'Siswa Dummy ' || lpad(n::text, 3, '0') end,
  case when n % 2 = 0 then 'female'::public.gender_type else 'male'::public.gender_type end,
  ('20000000-0000-4000-8000-' || lpad((100 + grade)::text, 12, '0'))::uuid,
  sg.id,
  null,
  case when n = 1 then 'siswa.dummy@sdi.test' else null end,
  '2026-07-01',
  '2027-06-30',
  case when n in (31, 132, 233, 334, 435, 536) then false else true end,
  'Data siswa sintetis untuk testing; bukan data nyata.',
  '10000000-0000-4000-8000-000000000003'::uuid
from generated_members gm
join public.study_groups sg
  on sg.class_id = ('20000000-0000-4000-8000-' || lpad((100 + gm.grade)::text, 12, '0'))::uuid
 and sg.name = gm.group_name
on conflict (id) do update
set
  user_id = excluded.user_id,
  member_code = excluded.member_code,
  card_number = excluded.card_number,
  student_card_number = excluded.student_card_number,
  nis = excluded.nis,
  nisn = excluded.nisn,
  full_name = excluded.full_name,
  gender = excluded.gender,
  class_id = excluded.class_id,
  study_group_id = excluded.study_group_id,
  email = excluded.email,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active,
  notes = excluded.notes,
  updated_at = now();

insert into public.members (
  id,
  user_id,
  member_code,
  card_number,
  is_student,
  full_name,
  gender,
  phone,
  email,
  joined_at,
  expires_at,
  is_active,
  notes,
  created_by
)
values
  (
    '30000000-0000-4000-8000-000000000901',
    '10000000-0000-4000-8000-000000000006',
    'DUMMY-GURU-0001',
    'DUMMY-LIB-GURU-0001',
    false,
    'Guru Member Dummy',
    'unknown',
    '080000000001',
    'guru.member.dummy@sdi.test',
    '2026-07-01',
    '2027-06-30',
    true,
    'Member non-siswa sintetis.',
    '10000000-0000-4000-8000-000000000003'
  ),
  (
    '30000000-0000-4000-8000-000000000902',
    null,
    'DUMMY-STAFF-0002',
    'DUMMY-LIB-STAFF-0002',
    false,
    'Tenaga Kependidikan Dummy',
    'unknown',
    '080000000002',
    null,
    '2026-07-01',
    '2027-06-30',
    true,
    'Member non-siswa sintetis.',
    '10000000-0000-4000-8000-000000000003'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  member_code = excluded.member_code,
  card_number = excluded.card_number,
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Master katalog.
-- ---------------------------------------------------------------------------

insert into public.categories (id, parent_id, name, slug, description, is_active)
values
  ('40000000-0000-4000-8000-000000000001', null, 'DUMMY Bacaan Anak', 'dummy-bacaan-anak', 'Kategori dummy bacaan anak.', true),
  ('40000000-0000-4000-8000-000000000002', null, 'DUMMY Pelajaran', 'dummy-pelajaran', 'Kategori dummy buku pelajaran.', true),
  ('40000000-0000-4000-8000-000000000003', null, 'DUMMY Agama', 'dummy-agama', 'Kategori dummy pendidikan agama.', true),
  ('40000000-0000-4000-8000-000000000004', null, 'DUMMY Referensi', 'dummy-referensi', 'Kategori dummy referensi.', true),
  ('40000000-0000-4000-8000-000000000005', null, 'DUMMY Cerita Rakyat', 'dummy-cerita-rakyat', 'Kategori dummy cerita rakyat.', true),
  ('40000000-0000-4000-8000-000000000006', null, 'DUMMY Sains Dasar', 'dummy-sains-dasar', 'Kategori dummy sains.', true),
  ('40000000-0000-4000-8000-000000000007', null, 'DUMMY Modul Guru', 'dummy-modul-guru', 'Kategori dummy modul guru.', true),
  ('40000000-0000-4000-8000-000000000008', null, 'DUMMY Multimedia', 'dummy-multimedia', 'Kategori dummy multimedia.', true)
on conflict (id) do update
set name = excluded.name, slug = excluded.slug, description = excluded.description, is_active = true, updated_at = now();

insert into public.authors (id, name, biography, is_active)
select
  ('41000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'Penulis Dummy ' || lpad(n::text, 2, '0'),
  'Biografi sintetis untuk pengujian.',
  true
from generate_series(1, 12) as n
on conflict (id) do update
set name = excluded.name, biography = excluded.biography, is_active = true, updated_at = now();

insert into public.publishers (id, name, city, website, is_active)
select
  ('42000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'Penerbit Dummy ' || lpad(n::text, 2, '0'),
  case when n % 2 = 0 then 'Lumajang' else 'Surabaya' end,
  null,
  true
from generate_series(1, 5) as n
on conflict (id) do update
set name = excluded.name, city = excluded.city, is_active = true, updated_at = now();

insert into public.shelves (id, code, name, location_description, is_active)
select
  ('43000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'DUMMY-RK-' || lpad(n::text, 2, '0'),
  'Rak Dummy ' || lpad(n::text, 2, '0'),
  'Area perpustakaan dummy nomor ' || n,
  true
from generate_series(1, 8) as n
on conflict (id) do update
set code = excluded.code, name = excluded.name, location_description = excluded.location_description, is_active = true, updated_at = now();

insert into public.replacement_cost_categories (
  id,
  name,
  lost_charge_mode,
  lost_fixed_amount,
  lost_percentage,
  damaged_charge_mode,
  damaged_fixed_amount,
  damaged_percentage,
  notes,
  is_active
)
values
  ('44000000-0000-4000-8000-000000000001', 'DUMMY Harga Penuh', 'full_book_price', 0, 100, 'percentage_of_price', 0, 50, 'Denda dummy harga penuh untuk hilang.', true),
  ('44000000-0000-4000-8000-000000000002', 'DUMMY Tetap Anak', 'fixed', 50000, 100, 'fixed', 15000, 50, 'Denda dummy nominal tetap.', true),
  ('44000000-0000-4000-8000-000000000003', 'DUMMY Persentase', 'percentage_of_price', 0, 100, 'percentage_of_price', 0, 40, 'Denda dummy persentase.', true)
on conflict (id) do update
set
  name = excluded.name,
  lost_charge_mode = excluded.lost_charge_mode,
  lost_fixed_amount = excluded.lost_fixed_amount,
  lost_percentage = excluded.lost_percentage,
  damaged_charge_mode = excluded.damaged_charge_mode,
  damaged_fixed_amount = excluded.damaged_fixed_amount,
  damaged_percentage = excluded.damaged_percentage,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Judul buku, pengarang, dan eksemplar.
-- ---------------------------------------------------------------------------

with title_data as (
  select
    n,
    ((n - 1) % 8) + 1 as category_n,
    ((n - 1) % 5) + 1 as publisher_n,
    ((n - 1) % 8) + 1 as shelf_n,
    ((n - 1) % 3) + 1 as cost_n
  from generate_series(1, 30) as n
)
insert into public.book_titles (
  id,
  catalog_code,
  isbn,
  title,
  subtitle,
  category_id,
  publisher_id,
  default_shelf_id,
  replacement_cost_category_id,
  publication_year,
  edition,
  language,
  page_count,
  synopsis,
  cover_path,
  purchase_price,
  is_reference_only,
  is_active,
  is_published,
  created_by
)
select
  ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'DUMMY-TITLE-' || lpad(n::text, 3, '0'),
  '978602' || lpad(n::text, 7, '0'),
  'Buku Dummy ' || lpad(n::text, 3, '0'),
  case when n % 4 = 0 then 'Edisi Uji Sirkulasi' else null end,
  ('40000000-0000-4000-8000-' || lpad(category_n::text, 12, '0'))::uuid,
  ('42000000-0000-4000-8000-' || lpad(publisher_n::text, 12, '0'))::uuid,
  ('43000000-0000-4000-8000-' || lpad(shelf_n::text, 12, '0'))::uuid,
  ('44000000-0000-4000-8000-' || lpad(cost_n::text, 12, '0'))::uuid,
  2015 + (n % 10),
  'Cetakan Dummy',
  'id',
  40 + (n * 3),
  'Sinopsis dummy untuk menguji katalog, pencarian, stok, dan laporan.',
  'covers/dummy-title-' || lpad(n::text, 3, '0') || '.jpg',
  35000 + (n * 1000),
  n in (9, 18, 27),
  true,
  n <> 30,
  '10000000-0000-4000-8000-000000000003'::uuid
from title_data
on conflict (id) do update
set
  catalog_code = excluded.catalog_code,
  isbn = excluded.isbn,
  title = excluded.title,
  subtitle = excluded.subtitle,
  category_id = excluded.category_id,
  publisher_id = excluded.publisher_id,
  default_shelf_id = excluded.default_shelf_id,
  replacement_cost_category_id = excluded.replacement_cost_category_id,
  publication_year = excluded.publication_year,
  edition = excluded.edition,
  page_count = excluded.page_count,
  synopsis = excluded.synopsis,
  cover_path = excluded.cover_path,
  purchase_price = excluded.purchase_price,
  is_reference_only = excluded.is_reference_only,
  is_active = excluded.is_active,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.book_authors (book_title_id, author_id, author_order)
select
  ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('41000000-0000-4000-8000-' || lpad((((n - 1) % 12) + 1)::text, 12, '0'))::uuid,
  1
from generate_series(1, 30) as n
on conflict (book_title_id, author_id) do update
set author_order = excluded.author_order;

insert into public.book_authors (book_title_id, author_id, author_order)
select
  ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('41000000-0000-4000-8000-' || lpad((((n + 2) % 12) + 1)::text, 12, '0'))::uuid,
  2
from generate_series(1, 30) as n
where n % 5 = 0
on conflict (book_title_id, author_id) do update
set author_order = excluded.author_order;

with copies as (
  select
    title_n,
    copy_n,
    (title_n * 10 + copy_n) as copy_key
  from generate_series(1, 30) as title_n
  cross join generate_series(1, 3) as copy_n
)
insert into public.book_copies (
  id,
  book_title_id,
  inventory_code,
  copy_number,
  shelf_id,
  acquisition_date,
  acquisition_source,
  purchase_price,
  condition,
  status,
  is_active,
  notes,
  created_by
)
select
  ('60000000-0000-4000-8000-' || lpad(copy_key::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(title_n::text, 12, '0'))::uuid,
  'DUMMY-INV-' || lpad(title_n::text, 3, '0') || '-' || copy_n,
  copy_n,
  ('43000000-0000-4000-8000-' || lpad((((title_n - 1) % 8) + 1)::text, 12, '0'))::uuid,
  '2026-07-01'::date - ((copy_key % 90) || ' days')::interval,
  'Pengadaan dummy',
  35000 + (title_n * 1000),
  'good',
  'available',
  true,
  'Eksemplar dummy; barcode/QR sama dengan inventory_code.',
  '10000000-0000-4000-8000-000000000003'::uuid
from copies
on conflict (id) do update
set
  book_title_id = excluded.book_title_id,
  inventory_code = excluded.inventory_code,
  copy_number = excluded.copy_number,
  shelf_id = excluded.shelf_id,
  acquisition_date = excluded.acquisition_date,
  acquisition_source = excluded.acquisition_source,
  purchase_price = excluded.purchase_price,
  condition = excluded.condition,
  status = excluded.status,
  is_active = excluded.is_active,
  notes = excluded.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Digital collections dan access logs.
-- ---------------------------------------------------------------------------

insert into public.digital_collections (
  id,
  category_id,
  title,
  slug,
  description,
  media_type,
  author_text,
  publisher_text,
  publication_year,
  file_path,
  preview_path,
  cover_path,
  mime_type,
  file_size_bytes,
  duration_seconds,
  is_downloadable,
  is_published,
  published_at,
  created_by
)
values
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'DUMMY E-book Matematika Dasar', 'dummy-ebook-matematika-dasar', 'E-book dummy untuk membaca online.', 'ebook', 'Tim Guru Dummy', 'SDI Digital Library', 2026, 'digital/dummy/ebook-matematika.pdf', 'digital/dummy/preview-ebook-matematika.pdf', 'covers/digital/dummy-ebook-matematika.jpg', 'application/pdf', 2457600, null, true, true, now() - interval '14 days', '10000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000007', 'DUMMY Modul Literasi Guru', 'dummy-modul-literasi-guru', 'Modul dummy untuk guru.', 'module', 'Tim Kurikulum Dummy', 'SDI Digital Library', 2026, 'digital/dummy/modul-literasi.pdf', null, 'covers/digital/dummy-modul-literasi.jpg', 'application/pdf', 1870000, null, false, true, now() - interval '10 days', '10000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000008', 'DUMMY Video Tata Surya', 'dummy-video-tata-surya', 'Video pembelajaran dummy.', 'video', 'Guru IPA Dummy', 'SDI Digital Library', 2025, 'digital/dummy/video-tata-surya.mp4', null, 'covers/digital/dummy-video-tata-surya.jpg', 'video/mp4', 15728640, 420, false, true, now() - interval '8 days', '10000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000006', 'DUMMY Eksperimen Sains', 'dummy-eksperimen-sains', 'Koleksi dummy belum dipublikasikan.', 'module', 'Tim Sains Dummy', 'SDI Digital Library', 2024, 'digital/dummy/eksperimen-sains.pdf', null, 'covers/digital/dummy-eksperimen.jpg', 'application/pdf', 990000, null, true, false, null, '10000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000003', 'DUMMY Panduan Ibadah', 'dummy-panduan-ibadah', 'E-book dummy agama.', 'ebook', 'Guru Agama Dummy', 'SDI Digital Library', 2022, 'digital/dummy/panduan-ibadah.pdf', null, 'covers/digital/dummy-panduan-ibadah.jpg', 'application/pdf', 1410000, null, true, true, now() - interval '5 days', '10000000-0000-4000-8000-000000000003'),
  ('70000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000002', 'DUMMY Video Pecahan', 'dummy-video-pecahan', 'Video matematika dummy.', 'video', 'Guru Matematika Dummy', 'SDI Digital Library', 2026, 'digital/dummy/video-pecahan.mp4', null, 'covers/digital/dummy-video-pecahan.jpg', 'video/mp4', 12582912, 300, false, true, now() - interval '4 days', '10000000-0000-4000-8000-000000000003')
on conflict (id) do update
set
  category_id = excluded.category_id,
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  media_type = excluded.media_type,
  author_text = excluded.author_text,
  publisher_text = excluded.publisher_text,
  publication_year = excluded.publication_year,
  file_path = excluded.file_path,
  preview_path = excluded.preview_path,
  cover_path = excluded.cover_path,
  mime_type = excluded.mime_type,
  file_size_bytes = excluded.file_size_bytes,
  duration_seconds = excluded.duration_seconds,
  is_downloadable = excluded.is_downloadable,
  is_published = excluded.is_published,
  published_at = excluded.published_at,
  updated_at = now();

delete from public.digital_access_logs dal
using public.digital_collections dc
where dc.id = dal.digital_collection_id
  and dc.slug like 'dummy-%';

insert into public.digital_access_logs (digital_collection_id, user_id, action, ip_address, user_agent, created_at)
select
  ('70000000-0000-4000-8000-' || lpad((((n - 1) % 8) + 1)::text, 12, '0'))::uuid,
  case when n % 5 = 0 then '10000000-0000-4000-8000-000000000006'::uuid else '10000000-0000-4000-8000-000000000004'::uuid end,
  case when n % 7 = 0 then 'download'::public.digital_action_type when n % 3 = 0 then 'play'::public.digital_action_type else 'view'::public.digital_action_type end,
  ('192.0.2.' || ((n % 200) + 1))::inet,
  'DummyBrowser/1.0',
  now() - (n || ' hours')::interval
from generate_series(1, 24) as n
;

-- ---------------------------------------------------------------------------
-- 6. Reservasi, peminjaman, pengembalian, perpanjangan, denda.
-- ---------------------------------------------------------------------------

insert into public.reservations (
  id,
  reservation_number,
  member_id,
  book_title_id,
  assigned_copy_id,
  status,
  requested_at,
  expires_at,
  approved_at,
  approved_by,
  rejected_at,
  rejected_by,
  rejection_reason,
  completed_at,
  notes
)
values
  ('80000000-0000-4000-8000-000000000001', 'DUMMY-RSV-000001', '30000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000010', null, 'pending', now() - interval '1 hour', now() + interval '23 hours', null, null, null, null, null, null, 'Reservasi pending dummy.'),
  ('80000000-0000-4000-8000-000000000002', 'DUMMY-RSV-000002', '30000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000041', 'approved', now() - interval '2 hours', now() + interval '22 hours', now() - interval '1 hour', '10000000-0000-4000-8000-000000000003', null, null, null, null, 'Reservasi approved dummy.'),
  ('80000000-0000-4000-8000-000000000003', 'DUMMY-RSV-000003', '30000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000005', null, 'rejected', now() - interval '2 days', now() - interval '1 day', null, null, now() - interval '1 day', '10000000-0000-4000-8000-000000000003', 'Stok tidak tersedia saat diuji.', null, 'Reservasi rejected dummy.'),
  ('80000000-0000-4000-8000-000000000004', 'DUMMY-RSV-000004', '30000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000006', null, 'cancelled', now() - interval '3 days', now() - interval '2 days', null, null, null, null, null, null, 'Reservasi cancelled dummy.'),
  ('80000000-0000-4000-8000-000000000005', 'DUMMY-RSV-000005', '30000000-0000-4000-8000-000000000014', '50000000-0000-4000-8000-000000000007', null, 'expired', now() - interval '4 days', now() - interval '3 days', null, null, null, null, null, null, 'Reservasi expired dummy.'),
  ('80000000-0000-4000-8000-000000000006', 'DUMMY-RSV-000006', '30000000-0000-4000-8000-000000000015', '50000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000081', 'completed', now() - interval '10 days', now() - interval '9 days', now() - interval '9 days', '10000000-0000-4000-8000-000000000003', null, null, null, now() - interval '9 days', 'Reservasi completed dummy.')
on conflict (id) do update
set
  reservation_number = excluded.reservation_number,
  member_id = excluded.member_id,
  book_title_id = excluded.book_title_id,
  assigned_copy_id = excluded.assigned_copy_id,
  status = excluded.status,
  requested_at = excluded.requested_at,
  expires_at = excluded.expires_at,
  approved_at = excluded.approved_at,
  approved_by = excluded.approved_by,
  rejected_at = excluded.rejected_at,
  rejected_by = excluded.rejected_by,
  rejection_reason = excluded.rejection_reason,
  completed_at = excluded.completed_at,
  notes = excluded.notes,
  updated_at = now();

insert into public.loans (
  id,
  loan_number,
  member_id,
  reservation_id,
  status,
  borrowed_at,
  created_by,
  notes,
  checkout_idempotency_key,
  checkout_request_hash
)
values
  ('81000000-0000-4000-8000-000000000001', 'DUMMY-LOAN-000001', '30000000-0000-4000-8000-000000000001', null, 'active', now() - interval '2 days', '10000000-0000-4000-8000-000000000003', 'Peminjaman aktif dummy.', '82000000-0000-4000-8000-000000000001', 'dummy-hash-1'),
  ('81000000-0000-4000-8000-000000000002', 'DUMMY-LOAN-000002', '30000000-0000-4000-8000-000000000002', null, 'overdue', now() - interval '12 days', '10000000-0000-4000-8000-000000000003', 'Peminjaman overdue dummy.', '82000000-0000-4000-8000-000000000002', 'dummy-hash-2'),
  ('81000000-0000-4000-8000-000000000003', 'DUMMY-LOAN-000003', '30000000-0000-4000-8000-000000000003', null, 'completed', now() - interval '20 days', '10000000-0000-4000-8000-000000000003', 'Peminjaman selesai tepat waktu dummy.', '82000000-0000-4000-8000-000000000003', 'dummy-hash-3'),
  ('81000000-0000-4000-8000-000000000004', 'DUMMY-LOAN-000004', '30000000-0000-4000-8000-000000000004', null, 'completed', now() - interval '18 days', '10000000-0000-4000-8000-000000000003', 'Peminjaman selesai dengan denda dummy.', '82000000-0000-4000-8000-000000000004', 'dummy-hash-4'),
  ('81000000-0000-4000-8000-000000000005', 'DUMMY-LOAN-000005', '30000000-0000-4000-8000-000000000005', null, 'active', now() - interval '3 days', '10000000-0000-4000-8000-000000000003', 'Peminjaman diperpanjang dummy.', '82000000-0000-4000-8000-000000000005', 'dummy-hash-5'),
  ('81000000-0000-4000-8000-000000000006', 'DUMMY-LOAN-000006', '30000000-0000-4000-8000-000000000015', '80000000-0000-4000-8000-000000000006', 'completed', now() - interval '9 days', '10000000-0000-4000-8000-000000000003', 'Konversi reservasi dummy.', '82000000-0000-4000-8000-000000000006', 'dummy-hash-6')
on conflict (id) do update
set
  loan_number = excluded.loan_number,
  member_id = excluded.member_id,
  reservation_id = excluded.reservation_id,
  status = excluded.status,
  borrowed_at = excluded.borrowed_at,
  created_by = excluded.created_by,
  notes = excluded.notes,
  checkout_idempotency_key = excluded.checkout_idempotency_key,
  checkout_request_hash = excluded.checkout_request_hash,
  updated_at = now();

insert into public.loan_items (
  id,
  loan_id,
  book_copy_id,
  borrowed_at,
  due_at,
  returned_at,
  renewal_count,
  status,
  return_condition,
  returned_by,
  notes
)
values
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000011', now() - interval '2 days', now() + interval '5 days', null, 0, 'borrowed', null, null, 'Item aktif dummy.'),
  ('83000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000021', now() - interval '2 days', now() + interval '5 days', null, 0, 'borrowed', null, null, 'Item aktif dummy.'),
  ('83000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000031', now() - interval '12 days', now() - interval '5 days', null, 0, 'overdue', null, null, 'Item overdue dummy.'),
  ('83000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000091', now() - interval '20 days', now() - interval '13 days', now() - interval '14 days', 0, 'returned', 'good', '10000000-0000-4000-8000-000000000003', 'Item returned dummy.'),
  ('83000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000052', now() - interval '18 days', now() - interval '11 days', now() - interval '8 days', 0, 'damaged', 'damaged', '10000000-0000-4000-8000-000000000003', 'Item rusak dummy.'),
  ('83000000-0000-4000-8000-000000000006', '81000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000062', now() - interval '18 days', now() - interval '11 days', now() - interval '7 days', 0, 'lost', 'lost', '10000000-0000-4000-8000-000000000003', 'Item hilang dummy.'),
  ('83000000-0000-4000-8000-000000000007', '81000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000101', now() - interval '3 days', now() + interval '5 days', null, 1, 'borrowed', null, null, 'Item sudah diperpanjang dummy.'),
  ('83000000-0000-4000-8000-000000000008', '81000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000081', now() - interval '9 days', now() - interval '2 days', now() - interval '1 day', 0, 'returned', 'good', '10000000-0000-4000-8000-000000000003', 'Item hasil reservasi dummy.')
on conflict (id) do update
set
  loan_id = excluded.loan_id,
  book_copy_id = excluded.book_copy_id,
  borrowed_at = excluded.borrowed_at,
  due_at = excluded.due_at,
  returned_at = excluded.returned_at,
  renewal_count = excluded.renewal_count,
  status = excluded.status,
  return_condition = excluded.return_condition,
  returned_by = excluded.returned_by,
  notes = excluded.notes,
  updated_at = now();

insert into public.loan_extensions (
  id,
  loan_item_id,
  previous_due_at,
  new_due_at,
  extended_at,
  extended_by,
  reason
)
values (
  '84000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000007',
  now() + interval '4 days',
  now() + interval '5 days',
  now() - interval '1 day',
  '10000000-0000-4000-8000-000000000003',
  'Perpanjangan dummy satu hari.'
)
on conflict (id) do update
set
  loan_item_id = excluded.loan_item_id,
  previous_due_at = excluded.previous_due_at,
  new_due_at = excluded.new_due_at,
  extended_at = excluded.extended_at,
  extended_by = excluded.extended_by,
  reason = excluded.reason;

insert into public.fines (
  id,
  member_id,
  loan_item_id,
  fine_type,
  days_late,
  amount,
  paid_amount,
  status,
  assessed_at,
  settled_at,
  description,
  created_by
)
values
  ('85000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000003', 'overdue', 5, 10000, 0, 'unpaid', now() - interval '1 day', null, 'Denda keterlambatan dummy.', '10000000-0000-4000-8000-000000000003'),
  ('85000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000005', 'damaged', 0, 15000, 5000, 'partial', now() - interval '7 days', null, 'Denda kerusakan dummy.', '10000000-0000-4000-8000-000000000003'),
  ('85000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000006', 'lost', 0, 45000, 45000, 'paid', now() - interval '7 days', now() - interval '6 days', 'Denda buku hilang dummy.', '10000000-0000-4000-8000-000000000003')
on conflict (id) do update
set
  member_id = excluded.member_id,
  loan_item_id = excluded.loan_item_id,
  fine_type = excluded.fine_type,
  days_late = excluded.days_late,
  amount = excluded.amount,
  paid_amount = excluded.paid_amount,
  status = excluded.status,
  assessed_at = excluded.assessed_at,
  settled_at = excluded.settled_at,
  description = excluded.description,
  updated_at = now();

insert into public.fine_payments (
  id,
  fine_id,
  amount,
  method,
  reference_number,
  paid_at,
  received_by,
  notes
)
select
  v.id,
  v.fine_id,
  v.amount,
  v.method,
  v.reference_number,
  v.paid_at,
  v.received_by,
  v.notes
from (
  values
    ('86000000-0000-4000-8000-000000000001'::uuid, '85000000-0000-4000-8000-000000000002'::uuid, 5000::numeric, 'cash'::public.payment_method, 'DUMMY-PAY-000001', now() - interval '6 days', '10000000-0000-4000-8000-000000000003'::uuid, 'Pembayaran partial dummy.'),
    ('86000000-0000-4000-8000-000000000002'::uuid, '85000000-0000-4000-8000-000000000003'::uuid, 45000::numeric, 'cash'::public.payment_method, 'DUMMY-PAY-000002', now() - interval '6 days', '10000000-0000-4000-8000-000000000003'::uuid, 'Pembayaran lunas dummy.')
) as v(id, fine_id, amount, method, reference_number, paid_at, received_by, notes)
where not exists (
  select 1
  from public.fine_payments fp
  where fp.id = v.id
);

update public.book_copies
set status = 'loaned', condition = 'good', is_active = true, updated_at = now()
where id in (
  '60000000-0000-4000-8000-000000000011',
  '60000000-0000-4000-8000-000000000021',
  '60000000-0000-4000-8000-000000000031',
  '60000000-0000-4000-8000-000000000101'
);

update public.book_copies
set status = 'reserved', condition = 'good', is_active = true, updated_at = now()
where id = '60000000-0000-4000-8000-000000000041';

update public.book_copies
set status = 'damaged', condition = 'damaged', is_active = true, updated_at = now()
where id in (
  '60000000-0000-4000-8000-000000000051',
  '60000000-0000-4000-8000-000000000052'
);

update public.book_copies
set status = 'lost', condition = 'lost', is_active = true, updated_at = now()
where id in (
  '60000000-0000-4000-8000-000000000061',
  '60000000-0000-4000-8000-000000000062'
);

update public.book_copies
set status = 'maintenance', condition = 'fair', is_active = true, updated_at = now()
where id = '60000000-0000-4000-8000-000000000071';

update public.book_copies
set status = 'inactive', condition = 'good', is_active = false, updated_at = now()
where id = '60000000-0000-4000-8000-000000000072';

-- ---------------------------------------------------------------------------
-- 7. Kunjungan individual/rombongan dan import jobs.
-- ---------------------------------------------------------------------------

insert into public.visits (
  id,
  member_id,
  guest_name,
  card_number_snapshot,
  method,
  entered_at,
  exited_at,
  recorded_by,
  notes
)
select
  ('87000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad((((n - 1) % 40) + 1)::text, 12, '0'))::uuid,
  null,
  'DUMMY-LIB-' || lpad((((n - 1) % 40) + 1)::text, 4, '0'),
  case when n % 4 = 0 then 'manual'::public.visit_method else 'card_scan'::public.visit_method end,
  now() - (n || ' hours')::interval,
  case when n % 3 = 0 then now() - (n || ' hours')::interval + interval '45 minutes' else null end,
  '10000000-0000-4000-8000-000000000003'::uuid,
  'Kunjungan individual dummy.'
from generate_series(1, 24) as n
on conflict (id) do update
set
  member_id = excluded.member_id,
  card_number_snapshot = excluded.card_number_snapshot,
  method = excluded.method,
  entered_at = excluded.entered_at,
  exited_at = excluded.exited_at,
  recorded_by = excluded.recorded_by,
  notes = excluded.notes;

insert into public.group_visits (
  id,
  class_id,
  study_group_id,
  teacher_name,
  participant_count,
  visited_at,
  recorded_by,
  notes
)
select
  ('88000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('20000000-0000-4000-8000-' || lpad((100 + (((n - 1) % 6) + 1))::text, 12, '0'))::uuid,
  sg.id,
  'Guru Pendamping Dummy ' || n,
  18 + n,
  now() - (n || ' days')::interval,
  '10000000-0000-4000-8000-000000000003'::uuid,
  'Kunjungan rombongan dummy.'
from generate_series(1, 6) as n
join public.study_groups sg
  on sg.class_id = ('20000000-0000-4000-8000-' || lpad((100 + (((n - 1) % 6) + 1))::text, 12, '0'))::uuid
 and sg.name = 'DUMMY A'
on conflict (id) do update
set
  class_id = excluded.class_id,
  study_group_id = excluded.study_group_id,
  teacher_name = excluded.teacher_name,
  participant_count = excluded.participant_count,
  visited_at = excluded.visited_at,
  recorded_by = excluded.recorded_by,
  notes = excluded.notes;

insert into public.import_jobs (
  id,
  import_type,
  file_name,
  file_path,
  status,
  total_rows,
  success_rows,
  failed_rows,
  requested_by,
  started_at,
  finished_at,
  summary
)
values
  ('89000000-0000-4000-8000-000000000001', 'members', 'dummy-members-import.csv', 'imports/dummy-members-import.csv', 'completed_with_errors', 10, 8, 2, '10000000-0000-4000-8000-000000000003', now() - interval '3 days', now() - interval '3 days' + interval '4 minutes', '{"source":"dummy","note":"uji error import member"}'::jsonb),
  ('89000000-0000-4000-8000-000000000002', 'books', 'dummy-books-import.csv', 'imports/dummy-books-import.csv', 'completed', 12, 12, 0, '10000000-0000-4000-8000-000000000003', now() - interval '2 days', now() - interval '2 days' + interval '6 minutes', '{"source":"dummy","note":"uji import buku sukses"}'::jsonb)
on conflict (id) do update
set
  import_type = excluded.import_type,
  file_name = excluded.file_name,
  file_path = excluded.file_path,
  status = excluded.status,
  total_rows = excluded.total_rows,
  success_rows = excluded.success_rows,
  failed_rows = excluded.failed_rows,
  requested_by = excluded.requested_by,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  summary = excluded.summary,
  updated_at = now();

insert into public.import_errors (
  import_job_id,
  row_number,
  raw_data,
  error_code,
  error_message
)
select
  '89000000-0000-4000-8000-000000000001'::uuid,
  v.row_number,
  v.raw_data,
  v.error_code,
  v.error_message
from (
  values
    (4, '{"nis":"","nisn":"9990000099","full_name":"Nama Tanpa NIS"}'::jsonb, 'MEMBER_NIS_REQUIRED', 'NIS wajib diisi untuk siswa.'),
    (9, '{"nis":"260001","nisn":"9990000001","full_name":"Duplikat Dummy"}'::jsonb, 'MEMBER_DUPLICATE', 'NIS/NISN/kartu sudah digunakan.')
) as v(row_number, raw_data, error_code, error_message)
where not exists (
  select 1
  from public.import_errors ie
  where ie.import_job_id = '89000000-0000-4000-8000-000000000001'::uuid
    and ie.row_number = v.row_number
    and ie.error_code = v.error_code
);

update public.library_settings
set
  max_active_loans = 3,
  loan_period_days = 7,
  max_renewals = 1,
  renewal_days = 1,
  overdue_fine_per_day = 2000,
  reservation_hold_hours = 24,
  currency_code = 'IDR',
  timezone_name = 'Asia/Jakarta',
  school_email = coalesce(school_email, 'perpustakaan@sdi.test'),
  updated_by = '10000000-0000-4000-8000-000000000001'
where id = 1;

commit;
