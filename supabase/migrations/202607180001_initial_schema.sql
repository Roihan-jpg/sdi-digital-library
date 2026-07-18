-- ============================================================================
-- SDI DIGITAL LIBRARY - INITIAL SUPABASE SCHEMA
-- Target: fresh Supabase project
-- Run once through Supabase SQL Editor or as the first migration.
-- ============================================================================

begin;

set local statement_timeout = '0';
set local lock_timeout = '10s';

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

create type public.app_role as enum (
  'master_admin',
  'head_librarian',
  'librarian',
  'member',
  'guest'
);

create type public.gender_type as enum ('male', 'female', 'unknown');

create type public.book_condition as enum (
  'new',
  'good',
  'fair',
  'damaged',
  'lost'
);

create type public.copy_status as enum (
  'available',
  'reserved',
  'loaned',
  'damaged',
  'lost',
  'maintenance',
  'inactive'
);

create type public.loan_status as enum (
  'active',
  'overdue',
  'completed',
  'cancelled'
);

create type public.loan_item_status as enum (
  'borrowed',
  'overdue',
  'returned',
  'damaged',
  'lost'
);

create type public.reservation_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
  'completed'
);

create type public.fine_type as enum (
  'overdue',
  'damaged',
  'lost',
  'other'
);

create type public.fine_status as enum (
  'unpaid',
  'partial',
  'paid',
  'waived'
);

create type public.payment_method as enum (
  'cash',
  'bank_transfer',
  'other'
);

create type public.digital_media_type as enum (
  'ebook',
  'module',
  'video',
  'audio'
);

create type public.digital_action_type as enum (
  'view',
  'play',
  'download'
);

create type public.visit_method as enum (
  'card_scan',
  'manual',
  'group'
);

create type public.import_type as enum (
  'members',
  'books',
  'book_copies'
);

create type public.import_status as enum (
  'queued',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);

create type public.charge_mode as enum (
  'fixed',
  'percentage_of_price',
  'full_book_price'
);

-- ============================================================================
-- 2. CORE IDENTITY AND SCHOOL MASTER DATA
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'guest',
  full_name text,
  avatar_path text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_year_date_check
    check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index school_year_single_active_idx
  on public.school_years (is_active)
  where is_active = true;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid references public.school_years(id) on delete restrict,
  grade_level smallint not null check (grade_level between 1 and 6),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_year_id, name)
);

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  homeroom_teacher_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  member_code text not null unique,
  card_number text not null unique,
  is_student boolean not null default true,
  nis text unique,
  nisn text unique,
  full_name text not null,
  gender public.gender_type not null default 'unknown',
  class_id uuid references public.classes(id) on delete set null,
  study_group_id uuid references public.study_groups(id) on delete set null,
  phone text,
  email text,
  joined_at date not null default current_date,
  expires_at date,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(full_name, '') || ' ' ||
      coalesce(member_code, '') || ' ' ||
      coalesce(card_number, '') || ' ' ||
      coalesce(nis, '') || ' ' ||
      coalesce(nisn, '')
    )
  ) stored,
  constraint student_identity_check
    check (
      is_student = false
      or (nis is not null and class_id is not null)
    ),
  constraint member_expiry_check
    check (expires_at is null or expires_at >= joined_at)
);

create index members_search_idx on public.members using gin (search_vector);
create index members_class_idx on public.members (class_id, study_group_id);
create index members_active_idx on public.members (is_active);

-- ============================================================================
-- 3. CATALOG MASTER DATA
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  biography text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index authors_name_unique_idx on public.authors (lower(name));

create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  website text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index publishers_name_unique_idx on public.publishers (lower(name));

create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.replacement_cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lost_charge_mode public.charge_mode not null default 'full_book_price',
  lost_fixed_amount numeric(14,2) not null default 0 check (lost_fixed_amount >= 0),
  lost_percentage numeric(7,2) not null default 100
    check (lost_percentage between 0 and 1000),
  damaged_charge_mode public.charge_mode not null default 'percentage_of_price',
  damaged_fixed_amount numeric(14,2) not null default 0 check (damaged_fixed_amount >= 0),
  damaged_percentage numeric(7,2) not null default 50
    check (damaged_percentage between 0 and 1000),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_titles (
  id uuid primary key default gen_random_uuid(),
  catalog_code text unique,
  isbn text,
  title text not null,
  subtitle text,
  category_id uuid references public.categories(id) on delete set null,
  publisher_id uuid references public.publishers(id) on delete set null,
  default_shelf_id uuid references public.shelves(id) on delete set null,
  replacement_cost_category_id uuid
    references public.replacement_cost_categories(id) on delete set null,
  publication_year integer check (
    publication_year is null or publication_year between 1000 and 2100
  ),
  edition text,
  language text not null default 'id',
  page_count integer check (page_count is null or page_count > 0),
  synopsis text,
  cover_path text,
  purchase_price numeric(14,2) check (purchase_price is null or purchase_price >= 0),
  is_reference_only boolean not null default false,
  is_active boolean not null default true,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(subtitle, '') || ' ' ||
      coalesce(isbn, '') || ' ' ||
      coalesce(catalog_code, '') || ' ' ||
      coalesce(synopsis, '')
    )
  ) stored
);

create index book_titles_search_idx on public.book_titles using gin (search_vector);
create index book_titles_category_idx on public.book_titles (category_id);
create index book_titles_published_idx
  on public.book_titles (is_published, is_active);

create table public.book_authors (
  book_title_id uuid not null references public.book_titles(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  author_order smallint not null default 1 check (author_order > 0),
  primary key (book_title_id, author_id)
);

create table public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_title_id uuid not null references public.book_titles(id) on delete restrict,
  inventory_code text not null unique,
  barcode_value text generated always as (inventory_code) stored,
  qr_value text generated always as (inventory_code) stored,
  copy_number integer check (copy_number is null or copy_number > 0),
  shelf_id uuid references public.shelves(id) on delete set null,
  acquisition_date date,
  acquisition_source text,
  purchase_price numeric(14,2) check (purchase_price is null or purchase_price >= 0),
  condition public.book_condition not null default 'good',
  status public.copy_status not null default 'available',
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_title_id, copy_number)
);

create index book_copies_title_status_idx
  on public.book_copies (book_title_id, status);
create index book_copies_inventory_idx on public.book_copies (inventory_code);
create index book_copies_available_idx
  on public.book_copies (book_title_id)
  where status = 'available' and is_active = true;

-- ============================================================================
-- 4. DIGITAL COLLECTION
-- ============================================================================

create table public.digital_collections (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  media_type public.digital_media_type not null,
  author_text text,
  publisher_text text,
  publication_year integer check (
    publication_year is null or publication_year between 1000 and 2100
  ),
  file_path text not null,
  preview_path text,
  cover_path text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_downloadable boolean not null default true,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(author_text, '') || ' ' ||
      coalesce(publisher_text, '')
    )
  ) stored
);

create index digital_collections_search_idx
  on public.digital_collections using gin (search_vector);
create index digital_collections_published_idx
  on public.digital_collections (media_type, is_published);

create table public.digital_access_logs (
  id bigint generated always as identity primary key,
  digital_collection_id uuid not null
    references public.digital_collections(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action public.digital_action_type not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index digital_access_logs_collection_idx
  on public.digital_access_logs (digital_collection_id, created_at desc);
create index digital_access_logs_user_idx
  on public.digital_access_logs (user_id, created_at desc);

-- ============================================================================
-- 5. VISITS
-- ============================================================================

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  guest_name text,
  card_number_snapshot text,
  method public.visit_method not null default 'card_scan',
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint visit_identity_check
    check (member_id is not null or guest_name is not null),
  constraint visit_time_check
    check (exited_at is null or exited_at >= entered_at)
);

create index visits_entered_at_idx on public.visits (entered_at desc);
create index visits_member_idx on public.visits (member_id, entered_at desc);

create table public.group_visits (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete set null,
  study_group_id uuid references public.study_groups(id) on delete set null,
  teacher_name text not null,
  participant_count integer not null check (participant_count > 0),
  visited_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index group_visits_visited_at_idx
  on public.group_visits (visited_at desc);

-- ============================================================================
-- 6. RESERVATION, LOAN, RETURN, AND FINES
-- ============================================================================

create sequence public.reservation_number_seq start 1;
create sequence public.loan_number_seq start 1;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  member_id uuid not null references public.members(id) on delete restrict,
  book_title_id uuid not null references public.book_titles(id) on delete restrict,
  assigned_copy_id uuid references public.book_copies(id) on delete set null,
  status public.reservation_status not null default 'pending',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_expiry_check check (expires_at > requested_at)
);

create unique index reservations_one_active_per_title_idx
  on public.reservations (member_id, book_title_id)
  where status in ('pending', 'approved');

create index reservations_status_idx
  on public.reservations (status, requested_at);
create index reservations_member_idx
  on public.reservations (member_id, requested_at desc);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique,
  member_id uuid not null references public.members(id) on delete restrict,
  reservation_id uuid unique references public.reservations(id) on delete set null,
  status public.loan_status not null default 'active',
  borrowed_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index loans_member_status_idx
  on public.loans (member_id, status, borrowed_at desc);
create index loans_borrowed_at_idx on public.loans (borrowed_at desc);

create table public.loan_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  book_copy_id uuid not null references public.book_copies(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  renewal_count integer not null default 0 check (renewal_count >= 0),
  status public.loan_item_status not null default 'borrowed',
  return_condition public.book_condition,
  returned_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_id, book_copy_id),
  constraint loan_item_return_time_check
    check (returned_at is null or returned_at >= borrowed_at)
);

create unique index loan_items_one_active_copy_idx
  on public.loan_items (book_copy_id)
  where returned_at is null and status in ('borrowed', 'overdue');

create index loan_items_due_idx
  on public.loan_items (due_at)
  where returned_at is null;
create index loan_items_loan_idx on public.loan_items (loan_id);

create table public.loan_extensions (
  id uuid primary key default gen_random_uuid(),
  loan_item_id uuid not null references public.loan_items(id) on delete cascade,
  previous_due_at timestamptz not null,
  new_due_at timestamptz not null,
  extended_at timestamptz not null default now(),
  extended_by uuid not null references public.profiles(id) on delete restrict,
  reason text,
  constraint extension_time_check check (new_due_at > previous_due_at)
);

create index loan_extensions_item_idx
  on public.loan_extensions (loan_item_id, extended_at desc);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  loan_item_id uuid references public.loan_items(id) on delete set null,
  fine_type public.fine_type not null,
  days_late integer not null default 0 check (days_late >= 0),
  amount numeric(14,2) not null check (amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status public.fine_status not null default 'unpaid',
  assessed_at timestamptz not null default now(),
  settled_at timestamptz,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_item_id, fine_type),
  constraint fine_payment_amount_check check (paid_amount <= amount)
);

create index fines_member_status_idx
  on public.fines (member_id, status, assessed_at desc);
create index fines_loan_item_idx on public.fines (loan_item_id);

create table public.fine_payments (
  id uuid primary key default gen_random_uuid(),
  fine_id uuid not null references public.fines(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  reference_number text,
  paid_at timestamptz not null default now(),
  received_by uuid not null references public.profiles(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create index fine_payments_fine_idx
  on public.fine_payments (fine_id, paid_at desc);

-- ============================================================================
-- 7. IMPORT, SETTINGS, AND AUDIT
-- ============================================================================

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  import_type public.import_type not null,
  file_name text not null,
  file_path text,
  status public.import_status not null default 'queued',
  total_rows integer not null default 0 check (total_rows >= 0),
  success_rows integer not null default 0 check (success_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_row_count_check
    check (success_rows + failed_rows <= total_rows),
  constraint import_time_check
    check (finished_at is null or started_at is null or finished_at >= started_at)
);

create table public.import_errors (
  id bigint generated always as identity primary key,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_data jsonb,
  error_code text,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index import_errors_job_idx
  on public.import_errors (import_job_id, row_number);

create table public.library_settings (
  id smallint primary key default 1 check (id = 1),
  max_active_loans integer not null default 3 check (max_active_loans > 0),
  loan_period_days integer not null default 7 check (loan_period_days > 0),
  max_renewals integer not null default 1 check (max_renewals >= 0),
  renewal_days integer not null default 1 check (renewal_days > 0),
  overdue_fine_per_day numeric(14,2) not null default 2000
    check (overdue_fine_per_day >= 0),
  reservation_hold_hours integer not null default 24
    check (reservation_hold_hours > 0),
  currency_code char(3) not null default 'IDR',
  timezone_name text not null default 'Asia/Jakarta',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.library_settings (
  id,
  max_active_loans,
  loan_period_days,
  max_renewals,
  renewal_days,
  overdue_fine_per_day,
  reservation_hold_hours,
  currency_code,
  timezone_name
) values (1, 3, 7, 1, 1, 2000, 24, 'IDR', 'Asia/Jakarta');

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index audit_logs_table_record_idx
  on public.audit_logs (table_name, record_id, created_at desc);
create index audit_logs_user_idx
  on public.audit_logs (user_id, created_at desc);

-- ============================================================================
-- 8. COMMON TRIGGER FUNCTIONS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger school_years_set_updated_at
before update on public.school_years
for each row execute function public.set_updated_at();

create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

create trigger study_groups_set_updated_at
before update on public.study_groups
for each row execute function public.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger authors_set_updated_at
before update on public.authors
for each row execute function public.set_updated_at();

create trigger publishers_set_updated_at
before update on public.publishers
for each row execute function public.set_updated_at();

create trigger shelves_set_updated_at
before update on public.shelves
for each row execute function public.set_updated_at();

create trigger replacement_cost_categories_set_updated_at
before update on public.replacement_cost_categories
for each row execute function public.set_updated_at();

create trigger book_titles_set_updated_at
before update on public.book_titles
for each row execute function public.set_updated_at();

create trigger book_copies_set_updated_at
before update on public.book_copies
for each row execute function public.set_updated_at();

create trigger digital_collections_set_updated_at
before update on public.digital_collections
for each row execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

create trigger loan_items_set_updated_at
before update on public.loan_items
for each row execute function public.set_updated_at();

create trigger fines_set_updated_at
before update on public.fines
for each row execute function public.set_updated_at();

create trigger import_jobs_set_updated_at
before update on public.import_jobs
for each row execute function public.set_updated_at();

create trigger library_settings_set_updated_at
before update on public.library_settings
for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. AUTHORIZATION HELPERS
-- ============================================================================

create or replace function public.is_service_role()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce((auth.jwt() ->> 'role') = 'service_role', false);
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
      limit 1
    ),
    'guest'::public.app_role
  );
$$;

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() = 'master_admin';
$$;

create or replace function public.is_library_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role() in ('master_admin', 'librarian');
$$;

create or replace function public.can_view_operations()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.current_app_role()
    in ('master_admin', 'head_librarian', 'librarian');
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be changed';
  end if;

  if session_user not in ('postgres', 'supabase_admin')
     and not public.is_service_role() then
    if new.role is distinct from old.role
       and not public.is_master_admin()
       and not (
         public.is_library_staff()
         and old.role = 'guest'
         and new.role = 'member'
       ) then
      raise exception 'Only master admin can change user roles';
    end if;

    if new.is_active is distinct from old.is_active
       and not public.is_master_admin() then
      raise exception 'Only master admin can change account activation';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'guest',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill profiles if Auth users already existed before this migration.
insert into public.profiles (id, role, full_name)
select
  u.id,
  'guest'::public.app_role,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  )
from auth.users u
on conflict (id) do nothing;

create or replace function public.bootstrap_master_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user with email % was not found', p_email;
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    is_active
  )
  select
    u.id,
    'master_admin'::public.app_role,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), '')
    ),
    true
  from auth.users u
  where u.id = v_user_id
  on conflict (id)
  do update set
    role = 'master_admin',
    is_active = true,
    updated_at = now();

  return v_user_id;
end;
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_master_admin() then
    raise exception 'Only master admin can change roles';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.link_member_account(
  p_member_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can link member accounts';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and is_active = true
  ) then
    raise exception 'Active user profile not found';
  end if;

  if exists (
    select 1 from public.members
    where user_id = p_user_id and id <> p_member_id
  ) then
    raise exception 'User account is already linked to another member';
  end if;

  update public.members
  set user_id = p_user_id,
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;

  update public.profiles
  set role = case
      when role = 'guest' then 'member'::public.app_role
      else role
    end,
    updated_at = now()
  where id = p_user_id;
end;
$$;

-- ============================================================================
-- 10. NUMBERING AND CALCULATION FUNCTIONS
-- ============================================================================

create or replace function public.next_reservation_number()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select
    'RSV-' ||
    to_char(timezone('Asia/Jakarta', now()), 'YYYYMM') ||
    '-' ||
    lpad(nextval('public.reservation_number_seq')::text, 6, '0');
$$;

create or replace function public.next_loan_number()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select
    'LOAN-' ||
    to_char(timezone('Asia/Jakarta', now()), 'YYYYMM') ||
    '-' ||
    lpad(nextval('public.loan_number_seq')::text, 6, '0');
$$;

create or replace function public.calculate_overdue_days(
  p_due_at timestamptz,
  p_returned_at timestamptz default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_due_date date;
  v_end_date date;
begin
  select timezone_name
  into v_timezone
  from public.library_settings
  where id = 1;

  v_due_date := timezone(v_timezone, p_due_at)::date;
  v_end_date := timezone(v_timezone, coalesce(p_returned_at, now()))::date;

  return greatest(v_end_date - v_due_date, 0);
end;
$$;

create or replace function public.calculate_replacement_charge(
  p_book_copy_id uuid,
  p_fine_type public.fine_type
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_price numeric(14,2);
  v_category_id uuid;
  v_category public.replacement_cost_categories%rowtype;
begin
  select
    coalesce(bc.purchase_price, bt.purchase_price, 0),
    bt.replacement_cost_category_id
  into v_price, v_category_id
  from public.book_copies bc
  join public.book_titles bt on bt.id = bc.book_title_id
  where bc.id = p_book_copy_id;

  if not found then
    raise exception 'Book copy not found';
  end if;

  if v_category_id is not null then
    select *
    into v_category
    from public.replacement_cost_categories
    where id = v_category_id;
  end if;

  if p_fine_type = 'lost' then
    if v_category.id is null then
      return v_price;
    end if;

    return case v_category.lost_charge_mode
      when 'fixed' then v_category.lost_fixed_amount
      when 'percentage_of_price'
        then round(v_price * v_category.lost_percentage / 100, 2)
      when 'full_book_price' then v_price
    end;
  elsif p_fine_type = 'damaged' then
    if v_category.id is null then
      return 0;
    end if;

    return case v_category.damaged_charge_mode
      when 'fixed' then v_category.damaged_fixed_amount
      when 'percentage_of_price'
        then round(v_price * v_category.damaged_percentage / 100, 2)
      when 'full_book_price' then v_price
    end;
  end if;

  return 0;
end;
$$;

-- ============================================================================
-- 11. RESERVATION AND CIRCULATION RPC FUNCTIONS
-- ============================================================================

create or replace function public.create_reservation(
  p_book_title_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_member public.members%rowtype;
  v_settings public.library_settings%rowtype;
  v_reservation_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into v_member
  from public.members
  where user_id = (select auth.uid())
    and is_active = true
    and (expires_at is null or expires_at >= current_date)
  limit 1;

  if v_member.id is null then
    raise exception 'Active library member account not found';
  end if;

  if not exists (
    select 1
    from public.book_titles bt
    where bt.id = p_book_title_id
      and bt.is_active = true
      and bt.is_published = true
      and bt.is_reference_only = false
  ) then
    raise exception 'Book title is unavailable for reservation';
  end if;

  if not exists (
    select 1
    from public.book_copies bc
    where bc.book_title_id = p_book_title_id
      and bc.status = 'available'
      and bc.is_active = true
  ) then
    raise exception 'No available copy for this title';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.member_id = v_member.id
      and r.book_title_id = p_book_title_id
      and r.status in ('pending', 'approved')
  ) then
    raise exception 'An active reservation already exists for this title';
  end if;

  select *
  into v_settings
  from public.library_settings
  where id = 1;

  insert into public.reservations (
    reservation_number,
    member_id,
    book_title_id,
    status,
    requested_at,
    expires_at,
    notes
  ) values (
    public.next_reservation_number(),
    v_member.id,
    p_book_title_id,
    'pending',
    now(),
    now() + make_interval(hours => v_settings.reservation_hold_hours),
    p_notes
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_member_user_id uuid;
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'Reservation not found';
  end if;

  select user_id
  into v_member_user_id
  from public.members
  where id = v_reservation.member_id;

  if not public.is_library_staff()
     and v_member_user_id is distinct from (select auth.uid()) then
    raise exception 'You cannot cancel this reservation';
  end if;

  if v_reservation.status not in ('pending', 'approved') then
    raise exception 'Only pending or approved reservations can be cancelled';
  end if;

  update public.reservations
  set status = 'cancelled',
      updated_at = now()
  where id = p_reservation_id;

  if v_reservation.assigned_copy_id is not null then
    update public.book_copies
    set status = 'available',
        updated_at = now()
    where id = v_reservation.assigned_copy_id
      and status = 'reserved';
  end if;
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
  v_available_count integer;
  v_reservation_copy_title uuid;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can create loans';
  end if;

  select *
  into v_settings
  from public.library_settings
  where id = 1;

  select *
  into v_member
  from public.members
  where id = p_member_id
  for update;

  if v_member.id is null then
    raise exception 'Member not found';
  end if;

  if v_member.is_active = false
     or (v_member.expires_at is not null and v_member.expires_at < current_date) then
    raise exception 'Member is inactive or expired';
  end if;

  v_requested_count := cardinality(p_copy_ids);

  if v_requested_count is null or v_requested_count = 0 then
    raise exception 'At least one book copy is required';
  end if;

  select count(distinct item)
  into v_unique_count
  from unnest(p_copy_ids) as t(item);

  if v_unique_count <> v_requested_count then
    raise exception 'Duplicate book copy IDs are not allowed';
  end if;

  select count(*)
  into v_active_count
  from public.loan_items li
  join public.loans l on l.id = li.loan_id
  where l.member_id = p_member_id
    and li.returned_at is null
    and li.status in ('borrowed', 'overdue');

  if v_active_count + v_requested_count > v_settings.max_active_loans then
    raise exception
      'Loan limit exceeded. Active: %, requested: %, maximum: %',
      v_active_count,
      v_requested_count,
      v_settings.max_active_loans;
  end if;

  perform 1
  from public.book_copies bc
  where bc.id = any(p_copy_ids)
  order by bc.id
  for update;

  select count(*)
  into v_available_count
  from public.book_copies bc
  join public.book_titles bt on bt.id = bc.book_title_id
  where bc.id = any(p_copy_ids)
    and bc.status = 'available'
    and bc.is_active = true
    and bt.is_active = true
    and bt.is_reference_only = false;

  if v_available_count <> v_requested_count then
    raise exception 'One or more book copies are unavailable';
  end if;

  if p_reservation_id is not null then
    if v_requested_count <> 1 then
      raise exception 'A reservation can only be converted into one loan item';
    end if;

    select *
    into v_reservation
    from public.reservations
    where id = p_reservation_id
    for update;

    if v_reservation.id is null then
      raise exception 'Reservation not found';
    end if;

    if v_reservation.member_id <> p_member_id then
      raise exception 'Reservation does not belong to this member';
    end if;

    if v_reservation.status not in ('pending', 'approved') then
      raise exception 'Reservation is not active';
    end if;

    select bc.book_title_id
    into v_reservation_copy_title
    from public.book_copies bc
    where bc.id = p_copy_ids[1];

    if v_reservation_copy_title <> v_reservation.book_title_id then
      raise exception 'Selected copy does not match the reserved title';
    end if;
  end if;

  v_due_at := now() + make_interval(days => v_settings.loan_period_days);

  insert into public.loans (
    loan_number,
    member_id,
    reservation_id,
    status,
    borrowed_at,
    created_by,
    notes
  ) values (
    public.next_loan_number(),
    p_member_id,
    p_reservation_id,
    'active',
    now(),
    (select auth.uid()),
    p_notes
  )
  returning id into v_loan_id;

  insert into public.loan_items (
    loan_id,
    book_copy_id,
    borrowed_at,
    due_at,
    status
  )
  select
    v_loan_id,
    bc.id,
    now(),
    v_due_at,
    'borrowed'
  from public.book_copies bc
  where bc.id = any(p_copy_ids);

  update public.book_copies
  set status = 'loaned',
      updated_at = now()
  where id = any(p_copy_ids);

  if p_reservation_id is not null then
    update public.reservations
    set assigned_copy_id = p_copy_ids[1],
        status = 'completed',
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, (select auth.uid())),
        completed_at = now(),
        updated_at = now()
    where id = p_reservation_id;
  end if;

  return v_loan_id;
end;
$$;

create or replace function public.create_loan_by_codes(
  p_card_number text,
  p_inventory_codes text[],
  p_notes text default null,
  p_reservation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_member_id uuid;
  v_copy_ids uuid[];
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can create loans';
  end if;

  select m.id
  into v_member_id
  from public.members m
  where m.card_number = trim(p_card_number)
    and m.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Active member card was not found';
  end if;

  select array_agg(bc.id order by bc.inventory_code)
  into v_copy_ids
  from public.book_copies bc
  where bc.inventory_code = any(p_inventory_codes);

  if cardinality(v_copy_ids) is distinct from cardinality(p_inventory_codes) then
    raise exception 'One or more inventory codes were not found';
  end if;

  return public.create_loan(
    v_member_id,
    v_copy_ids,
    p_notes,
    p_reservation_id
  );
end;
$$;

create or replace function public.refresh_loan_status(p_loan_id uuid)
returns public.loan_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_open_count integer;
  v_overdue_count integer;
  v_status public.loan_status;
begin
  select
    count(*) filter (where returned_at is null),
    count(*) filter (
      where returned_at is null
        and (status = 'overdue' or due_at < now())
    )
  into v_open_count, v_overdue_count
  from public.loan_items
  where loan_id = p_loan_id;

  v_status := case
    when v_open_count = 0 then 'completed'::public.loan_status
    when v_overdue_count > 0 then 'overdue'::public.loan_status
    else 'active'::public.loan_status
  end;

  update public.loans
  set status = v_status,
      updated_at = now()
  where id = p_loan_id;

  return v_status;
end;
$$;

create or replace function public.return_loan_item(
  p_loan_item_id uuid,
  p_condition public.book_condition default 'good',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item public.loan_items%rowtype;
  v_copy public.book_copies%rowtype;
  v_member_id uuid;
  v_settings public.library_settings%rowtype;
  v_days_late integer;
  v_overdue_amount numeric(14,2) := 0;
  v_replacement_amount numeric(14,2) := 0;
  v_item_status public.loan_item_status;
  v_copy_status public.copy_status;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can process returns';
  end if;

  select *
  into v_item
  from public.loan_items
  where id = p_loan_item_id
  for update;

  if v_item.id is null then
    raise exception 'Loan item not found';
  end if;

  if v_item.returned_at is not null then
    raise exception 'This loan item has already been returned';
  end if;

  select *
  into v_copy
  from public.book_copies
  where id = v_item.book_copy_id
  for update;

  select member_id
  into v_member_id
  from public.loans
  where id = v_item.loan_id;

  select *
  into v_settings
  from public.library_settings
  where id = 1;

  v_days_late := public.calculate_overdue_days(v_item.due_at, now());
  v_overdue_amount := v_days_late * v_settings.overdue_fine_per_day;

  if p_condition = 'lost' then
    v_item_status := 'lost';
    v_copy_status := 'lost';
    v_replacement_amount :=
      public.calculate_replacement_charge(v_copy.id, 'lost');
  elsif p_condition = 'damaged' then
    v_item_status := 'damaged';
    v_copy_status := 'damaged';
    v_replacement_amount :=
      public.calculate_replacement_charge(v_copy.id, 'damaged');
  else
    v_item_status := 'returned';
    v_copy_status := 'available';
  end if;

  update public.loan_items
  set returned_at = now(),
      returned_by = (select auth.uid()),
      return_condition = p_condition,
      status = v_item_status,
      notes = coalesce(p_notes, notes),
      updated_at = now()
  where id = p_loan_item_id;

  update public.book_copies
  set condition = p_condition,
      status = v_copy_status,
      updated_at = now()
  where id = v_copy.id;

  if v_overdue_amount > 0 then
    insert into public.fines (
      member_id,
      loan_item_id,
      fine_type,
      days_late,
      amount,
      status,
      description,
      created_by
    ) values (
      v_member_id,
      p_loan_item_id,
      'overdue',
      v_days_late,
      v_overdue_amount,
      'unpaid',
      'Denda keterlambatan pengembalian',
      (select auth.uid())
    )
    on conflict (loan_item_id, fine_type)
    do update set
      days_late = excluded.days_late,
      amount = greatest(public.fines.amount, excluded.amount),
      updated_at = now();
  end if;

  if v_replacement_amount > 0 then
    insert into public.fines (
      member_id,
      loan_item_id,
      fine_type,
      amount,
      status,
      description,
      created_by
    ) values (
      v_member_id,
      p_loan_item_id,
      case
        when p_condition = 'lost' then 'lost'::public.fine_type
        else 'damaged'::public.fine_type
      end,
      v_replacement_amount,
      'unpaid',
      case
        when p_condition = 'lost' then 'Biaya penggantian buku hilang'
        else 'Biaya kerusakan buku'
      end,
      (select auth.uid())
    )
    on conflict (loan_item_id, fine_type)
    do update set
      amount = greatest(public.fines.amount, excluded.amount),
      updated_at = now();
  end if;

  perform public.refresh_loan_status(v_item.loan_id);

  return jsonb_build_object(
    'loan_item_id', p_loan_item_id,
    'days_late', v_days_late,
    'overdue_fine', v_overdue_amount,
    'replacement_fine', v_replacement_amount,
    'copy_status', v_copy_status,
    'condition', p_condition
  );
end;
$$;

create or replace function public.return_book_by_inventory_code(
  p_inventory_code text,
  p_condition public.book_condition default 'good',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_loan_item_id uuid;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can process returns';
  end if;

  select li.id
  into v_loan_item_id
  from public.loan_items li
  join public.book_copies bc on bc.id = li.book_copy_id
  where bc.inventory_code = trim(p_inventory_code)
    and li.returned_at is null
    and li.status in ('borrowed', 'overdue')
  order by li.borrowed_at desc
  limit 1;

  if v_loan_item_id is null then
    raise exception 'No active loan was found for this inventory code';
  end if;

  return public.return_loan_item(
    v_loan_item_id,
    p_condition,
    p_notes
  );
end;
$$;

create or replace function public.renew_loan_item(
  p_loan_item_id uuid,
  p_reason text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item public.loan_items%rowtype;
  v_settings public.library_settings%rowtype;
  v_member_id uuid;
  v_book_title_id uuid;
  v_new_due_at timestamptz;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can renew loans';
  end if;

  select *
  into v_item
  from public.loan_items
  where id = p_loan_item_id
  for update;

  if v_item.id is null then
    raise exception 'Loan item not found';
  end if;

  if v_item.returned_at is not null
     or v_item.status not in ('borrowed', 'overdue') then
    raise exception 'Only active loan items can be renewed';
  end if;

  select *
  into v_settings
  from public.library_settings
  where id = 1;

  if v_item.renewal_count >= v_settings.max_renewals then
    raise exception 'Maximum renewal count has been reached';
  end if;

  select l.member_id, bc.book_title_id
  into v_member_id, v_book_title_id
  from public.loans l
  join public.book_copies bc on bc.id = v_item.book_copy_id
  where l.id = v_item.loan_id;

  if exists (
    select 1
    from public.reservations r
    where r.book_title_id = v_book_title_id
      and r.member_id <> v_member_id
      and r.status in ('pending', 'approved')
  ) then
    raise exception 'Renewal is blocked because another member has reserved this title';
  end if;

  v_new_due_at :=
    v_item.due_at + make_interval(days => v_settings.renewal_days);

  update public.loan_items
  set due_at = v_new_due_at,
      renewal_count = renewal_count + 1,
      status = case
        when v_new_due_at < now()
          then 'overdue'::public.loan_item_status
        else 'borrowed'::public.loan_item_status
      end,
      updated_at = now()
  where id = p_loan_item_id;

  insert into public.loan_extensions (
    loan_item_id,
    previous_due_at,
    new_due_at,
    extended_by,
    reason
  ) values (
    p_loan_item_id,
    v_item.due_at,
    v_new_due_at,
    (select auth.uid()),
    p_reason
  );

  perform public.refresh_loan_status(v_item.loan_id);

  return v_new_due_at;
end;
$$;

-- ============================================================================
-- 12. FINES AND PAYMENTS
-- ============================================================================

create or replace function public.validate_fine_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fine_amount numeric(14,2);
  v_existing_paid numeric(14,2);
begin
  if tg_op = 'UPDATE' and new.fine_id is distinct from old.fine_id then
    raise exception 'Fine payment cannot be moved to another fine';
  end if;

  select f.amount
  into v_fine_amount
  from public.fines f
  where f.id = new.fine_id
  for update;

  if v_fine_amount is null then
    raise exception 'Fine not found';
  end if;

  select coalesce(sum(fp.amount), 0)
  into v_existing_paid
  from public.fine_payments fp
  where fp.fine_id = new.fine_id
    and (tg_op = 'INSERT' or fp.id <> new.id);

  if v_existing_paid + new.amount > v_fine_amount then
    raise exception 'Payment exceeds outstanding fine amount';
  end if;

  return new;
end;
$$;

create trigger fine_payments_validate
before insert or update on public.fine_payments
for each row execute function public.validate_fine_payment();

create or replace function public.recalculate_fine_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fine_id uuid;
  v_amount numeric(14,2);
  v_paid numeric(14,2);
begin
  v_fine_id := case when tg_op = 'DELETE' then old.fine_id else new.fine_id end;

  select amount
  into v_amount
  from public.fines
  where id = v_fine_id;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.fine_payments
  where fine_id = v_fine_id;

  update public.fines
  set paid_amount = v_paid,
      status = case
        when status = 'waived' then 'waived'::public.fine_status
        when v_paid <= 0 then 'unpaid'::public.fine_status
        when v_paid < v_amount then 'partial'::public.fine_status
        else 'paid'::public.fine_status
      end,
      settled_at = case
        when v_paid >= v_amount then now()
        else null
      end,
      updated_at = now()
  where id = v_fine_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger fine_payments_recalculate
after insert or update or delete on public.fine_payments
for each row execute function public.recalculate_fine_status();

create or replace function public.record_fine_payment(
  p_fine_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_reference_number text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_payment_id uuid;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can record fine payments';
  end if;

  insert into public.fine_payments (
    fine_id,
    amount,
    method,
    reference_number,
    received_by,
    notes
  ) values (
    p_fine_id,
    p_amount,
    p_method,
    p_reference_number,
    (select auth.uid()),
    p_notes
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- ============================================================================
-- 13. VISIT AND MAINTENANCE FUNCTIONS
-- ============================================================================

create or replace function public.record_member_visit(
  p_card_number text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_member public.members%rowtype;
  v_visit_id uuid;
begin
  if not public.is_library_staff() then
    raise exception 'Only library staff can record visits';
  end if;

  select *
  into v_member
  from public.members
  where card_number = trim(p_card_number)
    and is_active = true
    and (expires_at is null or expires_at >= current_date)
  limit 1;

  if v_member.id is null then
    raise exception 'Active member card was not found';
  end if;

  insert into public.visits (
    member_id,
    card_number_snapshot,
    method,
    entered_at,
    recorded_by,
    notes
  ) values (
    v_member.id,
    v_member.card_number,
    'card_scan',
    now(),
    (select auth.uid()),
    p_notes
  )
  returning id into v_visit_id;

  return v_visit_id;
end;
$$;

create or replace function public.mark_overdue_items()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_updated integer;
begin
  if session_user not in ('postgres', 'supabase_admin')
     and not public.is_service_role()
     and not public.is_library_staff() then
    raise exception 'Not authorized to update overdue statuses';
  end if;

  update public.loan_items
  set status = 'overdue',
      updated_at = now()
  where returned_at is null
    and due_at < now()
    and status = 'borrowed';

  get diagnostics v_updated = row_count;

  update public.loans l
  set status = 'overdue',
      updated_at = now()
  where l.status = 'active'
    and exists (
      select 1
      from public.loan_items li
      where li.loan_id = l.id
        and li.returned_at is null
        and li.status = 'overdue'
    );

  return v_updated;
end;
$$;

create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_updated integer;
begin
  if session_user not in ('postgres', 'supabase_admin')
     and not public.is_service_role()
     and not public.is_library_staff() then
    raise exception 'Not authorized to expire reservations';
  end if;

  update public.reservations
  set status = 'expired',
      updated_at = now()
  where status in ('pending', 'approved')
    and expires_at < now();

  get diagnostics v_updated = row_count;

  update public.book_copies bc
  set status = 'available',
      updated_at = now()
  where bc.status = 'reserved'
    and not exists (
      select 1
      from public.reservations r
      where r.assigned_copy_id = bc.id
        and r.status = 'approved'
    );

  return v_updated;
end;
$$;

-- ============================================================================
-- 14. AUDIT LOGGING
-- ============================================================================

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_record_id text;
begin
  v_record_id := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(old) ->> 'id'
  );

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id
  ) values (
    tg_table_name,
    v_record_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    (select auth.uid())
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger members_audit
after insert or update or delete on public.members
for each row execute function public.write_audit_log();

create trigger book_titles_audit
after insert or update or delete on public.book_titles
for each row execute function public.write_audit_log();

create trigger book_copies_audit
after insert or update or delete on public.book_copies
for each row execute function public.write_audit_log();

create trigger digital_collections_audit
after insert or update or delete on public.digital_collections
for each row execute function public.write_audit_log();

create trigger reservations_audit
after insert or update or delete on public.reservations
for each row execute function public.write_audit_log();

create trigger loans_audit
after insert or update or delete on public.loans
for each row execute function public.write_audit_log();

create trigger loan_items_audit
after insert or update or delete on public.loan_items
for each row execute function public.write_audit_log();

create trigger fines_audit
after insert or update or delete on public.fines
for each row execute function public.write_audit_log();

create trigger library_settings_audit
after update on public.library_settings
for each row execute function public.write_audit_log();

-- ============================================================================
-- 15. REPORTING VIEWS (SERVER-SIDE USE)
-- ============================================================================

create or replace view public.v_catalog_availability as
select
  bt.id as book_title_id,
  bt.catalog_code,
  bt.isbn,
  bt.title,
  bt.subtitle,
  c.name as category_name,
  p.name as publisher_name,
  (
    select string_agg(a.name, ', ' order by ba.author_order, a.name)
    from public.book_authors ba
    join public.authors a on a.id = ba.author_id
    where ba.book_title_id = bt.id
  ) as authors,
  count(bc.id) filter (where bc.is_active = true) as total_copies,
  count(bc.id) filter (
    where bc.is_active = true and bc.status = 'available'
  ) as available_copies,
  count(bc.id) filter (
    where bc.is_active = true and bc.status = 'loaned'
  ) as loaned_copies,
  count(bc.id) filter (
    where bc.is_active = true and bc.status = 'damaged'
  ) as damaged_copies,
  count(bc.id) filter (
    where bc.is_active = true and bc.status = 'lost'
  ) as lost_copies
from public.book_titles bt
left join public.categories c on c.id = bt.category_id
left join public.publishers p on p.id = bt.publisher_id
left join public.book_copies bc on bc.book_title_id = bt.id
group by bt.id, c.name, p.name;

create or replace view public.v_overdue_loans as
select
  l.id as loan_id,
  l.loan_number,
  m.id as member_id,
  m.member_code,
  m.card_number,
  m.full_name as member_name,
  bt.id as book_title_id,
  bt.title,
  bc.id as book_copy_id,
  bc.inventory_code,
  li.id as loan_item_id,
  li.borrowed_at,
  li.due_at,
  public.calculate_overdue_days(li.due_at, null) as days_late,
  public.calculate_overdue_days(li.due_at, null)
    * s.overdue_fine_per_day as estimated_fine
from public.loan_items li
join public.loans l on l.id = li.loan_id
join public.members m on m.id = l.member_id
join public.book_copies bc on bc.id = li.book_copy_id
join public.book_titles bt on bt.id = bc.book_title_id
cross join public.library_settings s
where li.returned_at is null
  and li.due_at < now();

create or replace view public.v_popular_books as
select
  bt.id as book_title_id,
  bt.title,
  c.name as category_name,
  count(li.id) as total_borrowed,
  count(distinct l.member_id) as unique_borrowers,
  max(l.borrowed_at) as last_borrowed_at
from public.book_titles bt
left join public.categories c on c.id = bt.category_id
left join public.book_copies bc on bc.book_title_id = bt.id
left join public.loan_items li on li.book_copy_id = bc.id
left join public.loans l on l.id = li.loan_id
group by bt.id, c.name;

create or replace view public.v_active_members as
select
  m.id as member_id,
  m.member_code,
  m.nis,
  m.nisn,
  m.full_name,
  c.name as class_name,
  sg.name as study_group_name,
  count(li.id) as total_items_borrowed,
  count(li.id) filter (where li.returned_at is null) as active_items,
  max(l.borrowed_at) as last_borrowed_at
from public.members m
left join public.classes c on c.id = m.class_id
left join public.study_groups sg on sg.id = m.study_group_id
left join public.loans l on l.member_id = m.id
left join public.loan_items li on li.loan_id = l.id
group by m.id, c.name, sg.name;

create or replace view public.v_inventory_summary as
select
  bt.id as book_title_id,
  bt.catalog_code,
  bt.title,
  c.name as category_name,
  count(bc.id) as total_copies,
  count(bc.id) filter (where bc.status = 'available') as available,
  count(bc.id) filter (where bc.status = 'loaned') as loaned,
  count(bc.id) filter (where bc.status = 'reserved') as reserved,
  count(bc.id) filter (where bc.status = 'damaged') as damaged,
  count(bc.id) filter (where bc.status = 'lost') as lost,
  count(bc.id) filter (where bc.status = 'maintenance') as maintenance,
  count(bc.id) filter (where bc.status = 'inactive') as inactive
from public.book_titles bt
left join public.categories c on c.id = bt.category_id
left join public.book_copies bc on bc.book_title_id = bt.id
group by bt.id, c.name;

create or replace view public.v_daily_visits as
select
  visit_date,
  sum(individual_visits)::bigint as individual_visits,
  sum(group_visits)::bigint as group_visits,
  sum(group_participants)::bigint as group_participants
from (
  select
    timezone(s.timezone_name, v.entered_at)::date as visit_date,
    count(v.id)::bigint as individual_visits,
    0::bigint as group_visits,
    0::bigint as group_participants
  from public.visits v
  cross join public.library_settings s
  group by timezone(s.timezone_name, v.entered_at)::date

  union all

  select
    timezone(s.timezone_name, gv.visited_at)::date as visit_date,
    0::bigint as individual_visits,
    count(gv.id)::bigint as group_visits,
    coalesce(sum(gv.participant_count), 0)::bigint as group_participants
  from public.group_visits gv
  cross join public.library_settings s
  group by timezone(s.timezone_name, gv.visited_at)::date
) daily
group by visit_date;

-- ============================================================================
-- 16. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.school_years enable row level security;
alter table public.classes enable row level security;
alter table public.study_groups enable row level security;
alter table public.members enable row level security;
alter table public.categories enable row level security;
alter table public.authors enable row level security;
alter table public.publishers enable row level security;
alter table public.shelves enable row level security;
alter table public.replacement_cost_categories enable row level security;
alter table public.book_titles enable row level security;
alter table public.book_authors enable row level security;
alter table public.book_copies enable row level security;
alter table public.digital_collections enable row level security;
alter table public.digital_access_logs enable row level security;
alter table public.visits enable row level security;
alter table public.group_visits enable row level security;
alter table public.reservations enable row level security;
alter table public.loans enable row level security;
alter table public.loan_items enable row level security;
alter table public.loan_extensions enable row level security;
alter table public.fines enable row level security;
alter table public.fine_payments enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_errors enable row level security;
alter table public.library_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy profiles_select_own_or_management
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.can_view_operations()
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_master_admin_manage
on public.profiles
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

-- School data
create policy school_years_authenticated_select
on public.school_years
for select
to authenticated
using (true);

create policy school_years_staff_manage
on public.school_years
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy classes_authenticated_select
on public.classes
for select
to authenticated
using (true);

create policy classes_staff_manage
on public.classes
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy study_groups_authenticated_select
on public.study_groups
for select
to authenticated
using (true);

create policy study_groups_staff_manage
on public.study_groups
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Members
create policy members_select_own_or_management
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.can_view_operations()
);

create policy members_staff_insert
on public.members
for insert
to authenticated
with check (public.is_library_staff());

create policy members_staff_update
on public.members
for update
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy members_master_delete
on public.members
for delete
to authenticated
using (public.is_master_admin());

-- Public catalog master data
create policy categories_public_select
on public.categories
for select
to anon, authenticated
using (is_active = true or public.can_view_operations());

create policy categories_staff_manage
on public.categories
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy authors_public_select
on public.authors
for select
to anon, authenticated
using (is_active = true or public.can_view_operations());

create policy authors_staff_manage
on public.authors
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy publishers_public_select
on public.publishers
for select
to anon, authenticated
using (is_active = true or public.can_view_operations());

create policy publishers_staff_manage
on public.publishers
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy shelves_management_select
on public.shelves
for select
to authenticated
using (public.can_view_operations());

create policy shelves_staff_manage
on public.shelves
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy replacement_categories_management_select
on public.replacement_cost_categories
for select
to authenticated
using (public.can_view_operations());

create policy replacement_categories_staff_manage
on public.replacement_cost_categories
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy book_titles_authenticated_select
on public.book_titles
for select
to authenticated
using (
  (is_active = true and is_published = true)
  or public.can_view_operations()
);

create policy book_titles_staff_manage
on public.book_titles
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy book_authors_authenticated_select
on public.book_authors
for select
to authenticated
using (
  exists (
    select 1
    from public.book_titles bt
    where bt.id = book_title_id
      and (
        (bt.is_active = true and bt.is_published = true)
        or public.can_view_operations()
      )
  )
);

create policy book_authors_staff_manage
on public.book_authors
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy book_copies_management_select
on public.book_copies
for select
to authenticated
using (public.can_view_operations());

create policy book_copies_staff_manage
on public.book_copies
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Digital library
create policy digital_collections_authenticated_metadata
on public.digital_collections
for select
to authenticated
using (
  is_published = true
  or public.can_view_operations()
);

create policy digital_collections_staff_manage
on public.digital_collections
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy digital_access_logs_insert_own
on public.digital_access_logs
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy digital_access_logs_select_own_or_management
on public.digital_access_logs
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.can_view_operations()
);

-- Visits
create policy visits_select_own_or_management
on public.visits
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.members m
    where m.id = visits.member_id
      and m.user_id = (select auth.uid())
  )
);

create policy visits_staff_manage
on public.visits
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy group_visits_management_select
on public.group_visits
for select
to authenticated
using (public.can_view_operations());

create policy group_visits_staff_manage
on public.group_visits
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Reservations
create policy reservations_select_own_or_management
on public.reservations
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.members m
    where m.id = reservations.member_id
      and m.user_id = (select auth.uid())
  )
);

create policy reservations_staff_manage
on public.reservations
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Loans
create policy loans_select_own_or_management
on public.loans
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.members m
    where m.id = loans.member_id
      and m.user_id = (select auth.uid())
  )
);

create policy loans_staff_manage
on public.loans
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy loan_items_select_own_or_management
on public.loan_items
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.loans l
    join public.members m on m.id = l.member_id
    where l.id = loan_items.loan_id
      and m.user_id = (select auth.uid())
  )
);

create policy loan_items_staff_manage
on public.loan_items
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy loan_extensions_select_own_or_management
on public.loan_extensions
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    join public.members m on m.id = l.member_id
    where li.id = loan_extensions.loan_item_id
      and m.user_id = (select auth.uid())
  )
);

create policy loan_extensions_staff_manage
on public.loan_extensions
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Fines
create policy fines_select_own_or_management
on public.fines
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.members m
    where m.id = fines.member_id
      and m.user_id = (select auth.uid())
  )
);

create policy fines_staff_manage
on public.fines
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy fine_payments_select_own_or_management
on public.fine_payments
for select
to authenticated
using (
  public.can_view_operations()
  or exists (
    select 1
    from public.fines f
    join public.members m on m.id = f.member_id
    where f.id = fine_payments.fine_id
      and m.user_id = (select auth.uid())
  )
);

create policy fine_payments_staff_manage
on public.fine_payments
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Imports
create policy import_jobs_management_select
on public.import_jobs
for select
to authenticated
using (public.can_view_operations());

create policy import_jobs_staff_manage
on public.import_jobs
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

create policy import_errors_management_select
on public.import_errors
for select
to authenticated
using (public.can_view_operations());

create policy import_errors_staff_manage
on public.import_errors
for all
to authenticated
using (public.is_library_staff())
with check (public.is_library_staff());

-- Settings and audit
create policy library_settings_public_select
on public.library_settings
for select
to anon, authenticated
using (true);

create policy library_settings_master_update
on public.library_settings
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

create policy audit_logs_management_select
on public.audit_logs
for select
to authenticated
using (
  public.current_app_role() in ('master_admin', 'head_librarian')
);

-- ============================================================================
-- 17. DATABASE PRIVILEGES
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories to anon;
grant select on public.authors to anon;
grant select on public.publishers to anon;
grant select on public.library_settings to anon;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

revoke all on
  public.v_catalog_availability,
  public.v_overdue_loans,
  public.v_popular_books,
  public.v_active_members,
  public.v_inventory_summary,
  public.v_daily_visits
from anon, authenticated;

grant select on
  public.v_catalog_availability,
  public.v_overdue_loans,
  public.v_popular_books,
  public.v_active_members,
  public.v_inventory_summary,
  public.v_daily_visits
to service_role;

-- Revoke sensitive/internal functions from general PUBLIC execution.
revoke execute on function public.bootstrap_master_admin(text)
  from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;
revoke execute on function public.protect_profile_privileges()
  from public, anon, authenticated;
revoke execute on function public.write_audit_log()
  from public, anon, authenticated;
revoke execute on function public.set_updated_at()
  from public, anon, authenticated;
revoke execute on function public.next_reservation_number()
  from public, anon, authenticated;
revoke execute on function public.next_loan_number()
  from public, anon, authenticated;
revoke execute on function public.refresh_loan_status(uuid)
  from public, anon, authenticated;
revoke execute on function public.validate_fine_payment()
  from public, anon, authenticated;
revoke execute on function public.recalculate_fine_status()
  from public, anon, authenticated;

-- Explicit RPC access.
revoke execute on function public.set_user_role(uuid, public.app_role)
  from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role)
  to authenticated;

revoke execute on function public.link_member_account(uuid, uuid)
  from public, anon;
grant execute on function public.link_member_account(uuid, uuid)
  to authenticated;

revoke execute on function public.create_reservation(uuid, text)
  from public, anon;
grant execute on function public.create_reservation(uuid, text)
  to authenticated;

revoke execute on function public.cancel_reservation(uuid)
  from public, anon;
grant execute on function public.cancel_reservation(uuid)
  to authenticated;

revoke execute on function public.create_loan(uuid, uuid[], text, uuid)
  from public, anon;
grant execute on function public.create_loan(uuid, uuid[], text, uuid)
  to authenticated;

revoke execute on function public.create_loan_by_codes(text, text[], text, uuid)
  from public, anon;
grant execute on function public.create_loan_by_codes(text, text[], text, uuid)
  to authenticated;

revoke execute on function public.return_loan_item(
  uuid,
  public.book_condition,
  text
) from public, anon;
grant execute on function public.return_loan_item(
  uuid,
  public.book_condition,
  text
) to authenticated;

revoke execute on function public.return_book_by_inventory_code(
  text,
  public.book_condition,
  text
) from public, anon;
grant execute on function public.return_book_by_inventory_code(
  text,
  public.book_condition,
  text
) to authenticated;

revoke execute on function public.renew_loan_item(uuid, text)
  from public, anon;
grant execute on function public.renew_loan_item(uuid, text)
  to authenticated;

revoke execute on function public.record_fine_payment(
  uuid,
  numeric,
  public.payment_method,
  text,
  text
) from public, anon;
grant execute on function public.record_fine_payment(
  uuid,
  numeric,
  public.payment_method,
  text,
  text
) to authenticated;

revoke execute on function public.record_member_visit(text, text)
  from public, anon;
grant execute on function public.record_member_visit(text, text)
  to authenticated;

revoke execute on function public.mark_overdue_items()
  from public, anon;
grant execute on function public.mark_overdue_items()
  to authenticated, service_role;

revoke execute on function public.expire_reservations()
  from public, anon;
grant execute on function public.expire_reservations()
  to authenticated, service_role;

-- ============================================================================
-- 18. SUPABASE STORAGE BUCKETS AND POLICIES
-- Files must still be uploaded/deleted through the Storage API.
-- ============================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
(
  'covers',
  'covers',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
),
(
  'digital-library',
  'digital-library',
  false,
  524288000,
  array[
    'application/pdf',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav'
  ]
),
(
  'imports',
  'imports',
  false,
  20971520,
  array[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
),
(
  'exports',
  'exports',
  false,
  52428800,
  array[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy covers_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'covers');

create policy covers_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'covers'
  and public.is_library_staff()
);

create policy covers_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'covers'
  and public.is_library_staff()
)
with check (
  bucket_id = 'covers'
  and public.is_library_staff()
);

create policy covers_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'covers'
  and public.is_library_staff()
);

create policy digital_library_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'digital-library'
  and (
    public.is_library_staff()
    or exists (
      select 1
      from public.digital_collections dc
      where dc.is_published = true
        and (
          dc.file_path = storage.objects.name
          or dc.preview_path = storage.objects.name
        )
    )
  )
);

create policy digital_library_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'digital-library'
  and public.is_library_staff()
);

create policy digital_library_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'digital-library'
  and public.is_library_staff()
)
with check (
  bucket_id = 'digital-library'
  and public.is_library_staff()
);

create policy digital_library_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'digital-library'
  and public.is_library_staff()
);

create policy imports_staff_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'imports'
  and public.can_view_operations()
);

create policy imports_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'imports'
  and public.is_library_staff()
);

create policy imports_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'imports'
  and public.is_library_staff()
)
with check (
  bucket_id = 'imports'
  and public.is_library_staff()
);

create policy imports_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'imports'
  and public.is_library_staff()
);

create policy exports_management_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exports'
  and public.can_view_operations()
);

create policy exports_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exports'
  and public.is_library_staff()
);

create policy exports_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exports'
  and public.is_library_staff()
)
with check (
  bucket_id = 'exports'
  and public.is_library_staff()
);

create policy exports_staff_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exports'
  and public.is_library_staff()
);

-- ============================================================================
-- 19. STARTER REFERENCE DATA
-- ============================================================================

insert into public.categories (name, slug, description)
values
  ('Buku Pelajaran', 'buku-pelajaran', 'Koleksi buku pelajaran sekolah'),
  ('Fiksi', 'fiksi', 'Cerita, novel anak, dan karya fiksi'),
  ('Nonfiksi', 'nonfiksi', 'Koleksi pengetahuan umum nonfiksi'),
  ('Referensi', 'referensi', 'Kamus, ensiklopedia, atlas, dan referensi'),
  ('Modul Pembelajaran', 'modul-pembelajaran', 'Modul pembelajaran fisik dan digital'),
  ('E-Book', 'e-book', 'Koleksi buku elektronik'),
  ('Video Pembelajaran', 'video-pembelajaran', 'Koleksi video pembelajaran'),
  ('Audio Pembelajaran', 'audio-pembelajaran', 'Koleksi audio pembelajaran')
on conflict (slug) do nothing;

insert into public.replacement_cost_categories (
  name,
  lost_charge_mode,
  damaged_charge_mode,
  damaged_percentage,
  notes
) values
  (
    'Standar',
    'full_book_price',
    'percentage_of_price',
    50,
    'Buku hilang dibayar penuh; kerusakan dikenakan 50% dari harga buku.'
  ),
  (
    'Referensi Mahal',
    'full_book_price',
    'full_book_price',
    100,
    'Koleksi referensi khusus dapat dikenakan penggantian penuh.'
  )
on conflict (name) do nothing;

commit;

-- ============================================================================
-- POST-RUN BOOTSTRAP
-- ============================================================================
-- 1. Create the first user in Supabase Authentication.
-- 2. Run this separately in SQL Editor:
--
--    select public.bootstrap_master_admin('admin@sekolah.sch.id');
--
-- The bootstrap function is intentionally not executable from the public API.
