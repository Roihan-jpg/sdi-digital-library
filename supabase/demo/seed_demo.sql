-- DATA DEMO SINTETIS - BUKAN DATA SEKOLAH NYATA.
-- Jalankan hanya pada database lokal/staging secara manual. File ini sengaja tidak
-- tercantum di supabase/config.toml agar tidak pernah masuk production otomatis.

begin;

insert into public.school_years (id, name, starts_on, ends_on, is_active)
values ('d0000000-0000-4000-8000-000000000001', 'DEMO 2026/2027', '2026-07-01', '2027-06-30', false)
on conflict (id) do update set name = excluded.name;

insert into public.classes (id, school_year_id, grade_level, name, is_active)
values ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 4, 'DEMO Kelas 4', true)
on conflict (id) do update set name = excluded.name;

insert into public.study_groups (id, class_id, name, homeroom_teacher_name, is_active)
values ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'DEMO A', 'Guru Demo', true)
on conflict (id) do update set name = excluded.name;

insert into public.members (
  id, member_code, card_number, student_card_number, is_student, nis, nisn, full_name,
  gender, class_id, study_group_id, is_active, notes
)
values (
  'd0000000-0000-4000-8000-000000000010', 'DEMO-MEMBER-001', 'DEMO-CARD-001',
  'DEMO-STUDENT-CARD-001', true,
  'DEMO-NIS-001', 'DEMO-NISN-001', 'Siswa Demo Satu', 'unknown',
  'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003',
  true, 'Data sintetis untuk uji terima; bukan siswa nyata.'
)
on conflict (id) do update set full_name = excluded.full_name, is_active = true;

insert into public.categories (id, name, slug, description, is_active)
values (
  'd0000000-0000-4000-8000-000000000020', 'DEMO Bacaan Anak',
  'demo-bacaan-anak', 'Kategori sintetis untuk pengujian', true
)
on conflict (id) do update set name = excluded.name;

insert into public.book_titles (id, catalog_code, title, category_id, publication_year, synopsis, is_published)
select
  ('d0000000-0000-4000-8000-' || lpad(sequence::text, 12, '0'))::uuid,
  'DEMO-TITLE-' || lpad(sequence::text, 3, '0'),
  'Buku Demo ' || sequence,
  'd0000000-0000-4000-8000-000000000020',
  2026,
  'Buku sintetis untuk pengujian alur sirkulasi.',
  true
from generate_series(101, 104) as sequence
on conflict (id) do update set title = excluded.title, is_published = true;

insert into public.book_copies (id, book_title_id, inventory_code, copy_number, condition, status, notes)
select
  ('d0000000-0000-4000-8000-' || lpad((sequence + 100)::text, 12, '0'))::uuid,
  ('d0000000-0000-4000-8000-' || lpad(sequence::text, 12, '0'))::uuid,
  'DEMO-INV-' || lpad((sequence - 100)::text, 3, '0'),
  1,
  'good'::public.book_condition,
  'available'::public.copy_status,
  'Eksemplar demo; bukan inventaris sekolah.'
from generate_series(101, 104) as sequence
on conflict (id) do update set status = 'available', condition = 'good', is_active = true;

commit;
