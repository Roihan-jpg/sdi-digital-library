begin;

do $$
declare
  all_optimized_tables constant text[] := array[
    'profiles',
    'school_years',
    'classes',
    'study_groups',
    'categories',
    'authors',
    'publishers',
    'shelves',
    'replacement_cost_categories',
    'book_titles',
    'book_authors',
    'book_copies',
    'digital_collections',
    'visits',
    'group_visits',
    'reservations',
    'loans',
    'loan_items',
    'loan_extensions',
    'fines',
    'fine_payments',
    'import_jobs',
    'import_errors'
  ];
  direct_write_tables constant text[] := array[
    'school_years',
    'classes',
    'study_groups',
    'categories',
    'authors',
    'publishers',
    'shelves',
    'replacement_cost_categories',
    'book_titles',
    'book_authors',
    'book_copies',
    'digital_collections',
    'import_jobs',
    'import_errors'
  ];
  unexpected_all_policies integer;
  missing_write_policies integer;
begin
  select count(*)
  into unexpected_all_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = any(all_optimized_tables)
    and cmd = 'ALL';

  if unexpected_all_policies <> 0 then
    raise exception 'managed tables must not retain FOR ALL policies: % found',
      unexpected_all_policies;
  end if;

  select count(*)
  into missing_write_policies
  from unnest(direct_write_tables) as managed(table_name)
  cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as operation(command_name)
  where not exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = managed.table_name
      and policy.cmd = operation.command_name
      and policy.roles = array['authenticated']::name[]
  );

  if missing_write_policies <> 0 then
    raise exception 'staff-managed tables are missing % operation-specific policies',
      missing_write_policies;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_or_master_admin'
      and cmd = 'UPDATE'
  ) then
    raise exception 'profiles must use the consolidated self/master update policy';
  end if;
end;
$$;

insert into public.profiles (id, role, full_name)
values
  ('41000000-0000-4000-8000-000000000001', 'librarian', 'RLS Librarian'),
  ('41000000-0000-4000-8000-000000000002', 'head_librarian', 'RLS Head'),
  ('41000000-0000-4000-8000-000000000003', 'member', 'RLS Member');

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.categories (id, name, slug, is_active)
values (
  '42000000-0000-4000-8000-000000000001',
  'RLS Optimization Test',
  'rls-optimization-test',
  true
);

update public.categories
set description = 'updated by librarian'
where id = '42000000-0000-4000-8000-000000000001';

do $$
begin
  if not exists (
    select 1 from public.categories
    where id = '42000000-0000-4000-8000-000000000001'
      and description = 'updated by librarian'
  ) then
    raise exception 'librarian must retain insert, update, and select access';
  end if;
end;
$$;

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated"}';

do $$
begin
  if not exists (
    select 1 from public.categories
    where id = '42000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'head librarian must retain operational read access';
  end if;

  begin
    insert into public.categories (name, slug)
    values ('Forbidden Head Write', 'forbidden-head-write');
    raise exception 'head librarian must not gain staff write access';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000003","role":"authenticated"}';

update public.profiles
set full_name = 'RLS Member Updated'
where id = '41000000-0000-4000-8000-000000000003';

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id = '41000000-0000-4000-8000-000000000003'
      and full_name = 'RLS Member Updated'
  ) then
    raise exception 'member must retain self-profile update access';
  end if;

  begin
    insert into public.categories (name, slug)
    values ('Forbidden Member Write', 'forbidden-member-write');
    raise exception 'member must not gain staff write access';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

delete from public.categories
where id = '42000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (
    select 1 from public.categories
    where id = '42000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'librarian must retain delete access';
  end if;
end;
$$;

rollback;
