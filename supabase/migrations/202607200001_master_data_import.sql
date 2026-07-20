-- Complete the student identity model required by the operational member form.
-- NOT VALID preserves compatibility with legacy rows while enforcing the rule for new writes.
alter table public.members
  add column if not exists student_card_number text;

create unique index if not exists members_student_card_number_unique_idx
  on public.members (student_card_number)
  where student_card_number is not null;

alter table public.members drop constraint if exists student_identity_check;
alter table public.members
  add constraint student_identity_check
  check (
    is_student = false
    or (
      nullif(btrim(nis), '') is not null
      and nullif(btrim(nisn), '') is not null
      and class_id is not null
      and study_group_id is not null
      and nullif(btrim(student_card_number), '') is not null
      and nullif(btrim(card_number), '') is not null
    )
  ) not valid;

create index if not exists members_student_filter_idx
  on public.members (is_student, is_active, created_at desc);

create index if not exists book_copies_status_condition_idx
  on public.book_copies (status, condition, created_at desc);

create index if not exists import_jobs_requested_created_idx
  on public.import_jobs (requested_by, created_at desc);

-- One imported book row may create a title, author link, and copy. Keep those writes in one
-- database transaction so a failed copy never leaves an orphan title behind.
create or replace function public.import_book_row(p_row jsonb, p_created_by uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_publisher_id uuid;
  v_shelf_id uuid;
  v_author_id uuid;
  v_title_id uuid;
  v_copy_id uuid;
begin
  select id into v_category_id from public.categories where lower(name) = lower(p_row->>'category') and is_active limit 1;
  select id into v_publisher_id from public.publishers where lower(name) = lower(p_row->>'publisher') and is_active limit 1;
  select id into v_shelf_id from public.shelves where lower(code) = lower(p_row->>'shelf') and is_active limit 1;
  select id into v_author_id from public.authors where lower(name) = lower(p_row->>'author') and is_active limit 1;

  if v_category_id is null or v_publisher_id is null or v_shelf_id is null or v_author_id is null then
    raise exception using errcode = 'P0001', message = 'IMPORT_REFERENCE_NOT_FOUND';
  end if;

  if nullif(btrim(p_row->>'isbn'), '') is not null then
    select id into v_title_id from public.book_titles where isbn = btrim(p_row->>'isbn') limit 1;
  end if;

  if v_title_id is null then
    insert into public.book_titles (
      title, category_id, publisher_id, default_shelf_id, publication_year, isbn,
      purchase_price, created_by
    ) values (
      btrim(p_row->>'title'), v_category_id, v_publisher_id, v_shelf_id,
      nullif(p_row->>'publication_year', '')::integer, nullif(btrim(p_row->>'isbn'), ''),
      nullif(p_row->>'replacement_cost', '')::numeric, p_created_by
    ) returning id into v_title_id;

    insert into public.book_authors (book_title_id, author_id)
    values (v_title_id, v_author_id);
  end if;

  insert into public.book_copies (
    book_title_id, inventory_code, shelf_id, condition, status, purchase_price, created_by
  ) values (
    v_title_id, btrim(p_row->>'inventory_code'), v_shelf_id,
    coalesce(nullif(p_row->>'condition', ''), 'good')::public.book_condition,
    coalesce(nullif(p_row->>'status', ''), 'available')::public.copy_status,
    nullif(p_row->>'replacement_cost', '')::numeric, p_created_by
  ) returning id into v_copy_id;

  return v_copy_id;
end;
$$;

revoke execute on function public.import_book_row(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.import_book_row(jsonb, uuid) to service_role;

-- Existing RLS policies are retained. These audit triggers cover the master data and imports
-- introduced to the operational UI without creating a second audit mechanism.
drop trigger if exists audit_school_years on public.school_years;
create trigger audit_school_years after insert or update or delete on public.school_years
for each row execute function public.write_audit_log();

drop trigger if exists audit_classes on public.classes;
create trigger audit_classes after insert or update or delete on public.classes
for each row execute function public.write_audit_log();

drop trigger if exists audit_study_groups on public.study_groups;
create trigger audit_study_groups after insert or update or delete on public.study_groups
for each row execute function public.write_audit_log();

drop trigger if exists audit_categories on public.categories;
create trigger audit_categories after insert or update or delete on public.categories
for each row execute function public.write_audit_log();

drop trigger if exists audit_authors on public.authors;
create trigger audit_authors after insert or update or delete on public.authors
for each row execute function public.write_audit_log();

drop trigger if exists audit_publishers on public.publishers;
create trigger audit_publishers after insert or update or delete on public.publishers
for each row execute function public.write_audit_log();

drop trigger if exists audit_shelves on public.shelves;
create trigger audit_shelves after insert or update or delete on public.shelves
for each row execute function public.write_audit_log();

drop trigger if exists audit_replacement_cost_categories on public.replacement_cost_categories;
create trigger audit_replacement_cost_categories
after insert or update or delete on public.replacement_cost_categories
for each row execute function public.write_audit_log();

drop trigger if exists audit_import_jobs on public.import_jobs;
create trigger audit_import_jobs after insert or update or delete on public.import_jobs
for each row execute function public.write_audit_log();
