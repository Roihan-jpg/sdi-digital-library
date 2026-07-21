alter table public.library_settings
  add column school_name text not null default 'SD Islam Tompokersan Lumajang',
  add column school_address text,
  add column school_phone text,
  add column school_email text,
  add column school_logo_path text;

alter function public.set_updated_at() set search_path = '';

update public.library_settings
set
  school_address = 'Jl. Kapten Kyai Ilyas No.12, Tompokersan, Kec. Lumajang, Kabupaten Lumajang, Jawa Timur 67311',
  school_phone = '+62 812-4670-4044'
where id = 1;

drop policy library_settings_public_select on public.library_settings;
revoke select on public.library_settings from anon;

create policy library_settings_master_select
on public.library_settings
for select
to authenticated
using (public.is_master_admin());

create index book_copies_status_active_idx
  on public.book_copies (status)
  where is_active = true;

create index fines_open_assessed_idx
  on public.fines (assessed_at desc)
  where status in ('unpaid', 'partial');

create index fine_payments_paid_at_idx
  on public.fine_payments (paid_at desc);

create index digital_access_logs_created_action_idx
  on public.digital_access_logs (created_at desc, action);

create index group_visits_class_date_idx
  on public.group_visits (class_id, study_group_id, visited_at desc);

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
  count(bc.id) filter (where bc.status = 'inactive') as inactive,
  bt.category_id
from public.book_titles bt
left join public.categories c on c.id = bt.category_id
left join public.book_copies bc on bc.book_title_id = bt.id
group by bt.id, c.name;

alter view public.v_inventory_summary set (security_invoker = true);

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
  max(l.borrowed_at) as last_borrowed_at,
  m.is_student,
  m.class_id,
  m.study_group_id
from public.members m
left join public.classes c on c.id = m.class_id
left join public.study_groups sg on sg.id = m.study_group_id
left join public.loans l on l.member_id = m.id
left join public.loan_items li on li.loan_id = l.id
group by m.id, c.name, sg.name;

alter view public.v_active_members set (security_invoker = true);

create or replace view public.v_dashboard_kpis
with (security_invoker = true)
as
select
  (select count(*) from public.book_titles where is_active = true)::bigint as total_titles,
  (select count(*) from public.book_copies where is_active = true)::bigint as total_copies,
  (select count(*) from public.book_copies where is_active = true and status = 'available')::bigint as available_copies,
  (select count(*) from public.book_copies where is_active = true and status = 'loaned')::bigint as loaned_copies,
  (select count(*) from public.reservations where status = 'pending')::bigint as pending_reservations,
  (select count(*) from public.loan_items where returned_at is null and due_at < now())::bigint as overdue_items,
  (select count(*) from public.book_copies where is_active = true and status = 'damaged')::bigint as damaged_copies,
  (select count(*) from public.book_copies where is_active = true and status = 'lost')::bigint as lost_copies,
  (
    select count(*)
    from public.visits v
    cross join public.library_settings s
    where timezone(s.timezone_name, v.entered_at)::date = timezone(s.timezone_name, now())::date
  )::bigint as visits_today,
  coalesce((
    select sum(f.amount - f.paid_amount)
    from public.fines f
    where f.status in ('unpaid', 'partial')
  ), 0)::numeric(14,2) as outstanding_fines;

create or replace view public.v_daily_loans
with (security_invoker = true)
as
select
  timezone(s.timezone_name, l.borrowed_at)::date as activity_date,
  count(distinct l.id)::bigint as loan_transactions,
  count(li.id)::bigint as items_borrowed
from public.loans l
join public.loan_items li on li.loan_id = l.id
cross join public.library_settings s
group by timezone(s.timezone_name, l.borrowed_at)::date;

create or replace view public.v_digital_activity_daily
with (security_invoker = true)
as
select
  timezone(s.timezone_name, dal.created_at)::date as activity_date,
  dc.id as digital_collection_id,
  dc.title,
  dc.category_id,
  c.name as category_name,
  dc.media_type,
  dal.action,
  count(*)::bigint as total_actions,
  count(distinct dal.user_id)::bigint as unique_users
from public.digital_access_logs dal
join public.digital_collections dc on dc.id = dal.digital_collection_id
left join public.categories c on c.id = dc.category_id
cross join public.library_settings s
group by
  timezone(s.timezone_name, dal.created_at)::date,
  dc.id,
  c.name,
  dal.action;

revoke all on
  public.v_dashboard_kpis,
  public.v_daily_loans,
  public.v_digital_activity_daily
from public, anon, authenticated;

grant select on
  public.v_dashboard_kpis,
  public.v_daily_loans,
  public.v_digital_activity_daily
to service_role;
