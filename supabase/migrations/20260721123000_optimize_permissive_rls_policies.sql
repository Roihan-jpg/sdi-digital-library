-- Remove overlapping permissive policies created by FOR ALL policies.
-- Read access remains governed by the existing SELECT policies, while staff
-- mutations retain the same authorization checks through operation-specific
-- policies.

drop policy profiles_update_own on public.profiles;
drop policy profiles_master_admin_manage on public.profiles;

create policy profiles_master_admin_insert
on public.profiles
for insert
to authenticated
with check (public.is_master_admin());

create policy profiles_update_own_or_master_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or public.is_master_admin()
)
with check (
  id = (select auth.uid())
  or public.is_master_admin()
);

create policy profiles_master_admin_delete
on public.profiles
for delete
to authenticated
using (public.is_master_admin());

do $migration$
declare
  policy_record record;
begin
  for policy_record in
    select *
    from (
      values
        ('school_years', 'school_years_staff_manage'),
        ('classes', 'classes_staff_manage'),
        ('study_groups', 'study_groups_staff_manage'),
        ('categories', 'categories_staff_manage'),
        ('authors', 'authors_staff_manage'),
        ('publishers', 'publishers_staff_manage'),
        ('shelves', 'shelves_staff_manage'),
        ('replacement_cost_categories', 'replacement_categories_staff_manage'),
        ('book_titles', 'book_titles_staff_manage'),
        ('book_authors', 'book_authors_staff_manage'),
        ('book_copies', 'book_copies_staff_manage'),
        ('digital_collections', 'digital_collections_staff_manage'),
        ('visits', 'visits_staff_manage'),
        ('group_visits', 'group_visits_staff_manage'),
        ('reservations', 'reservations_staff_manage'),
        ('loans', 'loans_staff_manage'),
        ('loan_items', 'loan_items_staff_manage'),
        ('loan_extensions', 'loan_extensions_staff_manage'),
        ('fines', 'fines_staff_manage'),
        ('fine_payments', 'fine_payments_staff_manage'),
        ('import_jobs', 'import_jobs_staff_manage'),
        ('import_errors', 'import_errors_staff_manage')
    ) as policies(table_name, old_policy_name)
  loop
    execute format(
      'drop policy %I on public.%I',
      policy_record.old_policy_name,
      policy_record.table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_library_staff())',
      policy_record.table_name || '_staff_insert',
      policy_record.table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_library_staff()) with check (public.is_library_staff())',
      policy_record.table_name || '_staff_update',
      policy_record.table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_library_staff())',
      policy_record.table_name || '_staff_delete',
      policy_record.table_name
    );
  end loop;
end;
$migration$;
