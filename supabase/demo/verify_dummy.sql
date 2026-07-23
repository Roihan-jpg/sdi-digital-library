with table_counts as (
  select 'profiles' as table_name, count(*) as total from public.profiles where id::text like '10000000-%'
  union all select 'members', count(*) from public.members where member_code like 'DUMMY-%'
  union all select 'classes', count(*) from public.classes where name like 'DUMMY%'
  union all select 'study_groups', count(*) from public.study_groups where name like 'DUMMY%'
  union all select 'categories', count(*) from public.categories where slug like 'dummy-%'
  union all select 'authors', count(*) from public.authors where name like 'Penulis Dummy%'
  union all select 'publishers', count(*) from public.publishers where name like 'Penerbit Dummy%'
  union all select 'shelves', count(*) from public.shelves where code like 'DUMMY-%'
  union all select 'replacement_cost_categories', count(*) from public.replacement_cost_categories where name like 'DUMMY%'
  union all select 'book_titles', count(*) from public.book_titles where catalog_code like 'DUMMY-%'
  union all select 'book_authors', count(*) from public.book_authors ba join public.book_titles bt on bt.id = ba.book_title_id where bt.catalog_code like 'DUMMY-%'
  union all select 'book_copies', count(*) from public.book_copies where inventory_code like 'DUMMY-%'
  union all select 'digital_collections', count(*) from public.digital_collections where slug like 'dummy-%'
  union all select 'digital_access_logs', count(*) from public.digital_access_logs dal join public.digital_collections dc on dc.id = dal.digital_collection_id where dc.slug like 'dummy-%'
  union all select 'reservations', count(*) from public.reservations where reservation_number like 'DUMMY-%'
  union all select 'loans', count(*) from public.loans where loan_number like 'DUMMY-%'
  union all select 'loan_items', count(*) from public.loan_items li join public.loans l on l.id = li.loan_id where l.loan_number like 'DUMMY-%'
  union all select 'loan_extensions', count(*) from public.loan_extensions where id::text like '84000000-%'
  union all select 'fines', count(*) from public.fines where id::text like '85000000-%'
  union all select 'fine_payments', count(*) from public.fine_payments where reference_number like 'DUMMY-%'
  union all select 'visits', count(*) from public.visits where id::text like '87000000-%'
  union all select 'group_visits', count(*) from public.group_visits where id::text like '88000000-%'
  union all select 'import_jobs', count(*) from public.import_jobs where file_name like 'dummy-%'
  union all select 'import_errors', count(*) from public.import_errors ie join public.import_jobs ij on ij.id = ie.import_job_id where ij.file_name like 'dummy-%'
),
copy_status as (
  select status::text as status, count(*) as total
  from public.book_copies
  where inventory_code like 'DUMMY-%'
  group by status
),
reservation_status as (
  select status::text as status, count(*) as total
  from public.reservations
  where reservation_number like 'DUMMY-%'
  group by status
),
dummy_accounts as (
  select
    u.email,
    p.role::text as role,
    p.full_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email like '%.dummy@sdi.test'
)
select jsonb_build_object(
  'table_counts', (select jsonb_object_agg(table_name, total order by table_name) from table_counts),
  'copy_status', (select jsonb_object_agg(status, total order by status) from copy_status),
  'reservation_status', (select jsonb_object_agg(status, total order by status) from reservation_status),
  'accounts', (select jsonb_agg(dummy_accounts order by role, email) from dummy_accounts)
) as dummy_seed_summary;
