begin;

do $$
begin
  if has_table_privilege('anon', 'public.v_dashboard_kpis', 'select')
     or has_table_privilege('authenticated', 'public.v_dashboard_kpis', 'select') then
    raise exception 'reporting views must not be exposed to browser roles';
  end if;
  if not has_table_privilege('service_role', 'public.v_dashboard_kpis', 'select') then
    raise exception 'service_role must read reporting views';
  end if;
end;
$$;

insert into public.profiles (id, role, full_name)
values ('30000000-0000-4000-8000-000000000001', 'member', 'Member Report');

insert into public.members (
  id, member_code, card_number, is_student, full_name
) values (
  '31000000-0000-4000-8000-000000000001', 'REPORT-001', 'CARD-REPORT-001', false, 'Member Report'
);

insert into public.book_titles (
  id, catalog_code, title, is_active, is_published
) values (
  '32000000-0000-4000-8000-000000000001', 'REPORT-BOOK', 'Buku Laporan', true, true
);

insert into public.book_copies (
  id, book_title_id, inventory_code, status, condition
) values
  ('33000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'REPORT-AVAILABLE', 'available', 'good'),
  ('33000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001', 'REPORT-LOANED', 'loaned', 'good'),
  ('33000000-0000-4000-8000-000000000003', '32000000-0000-4000-8000-000000000001', 'REPORT-DAMAGED', 'damaged', 'damaged'),
  ('33000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000001', 'REPORT-LOST', 'lost', 'lost');

insert into public.loans (
  id, loan_number, member_id, status, borrowed_at, created_by
) values (
  '34000000-0000-4000-8000-000000000001', 'LOAN-REPORT-001',
  '31000000-0000-4000-8000-000000000001', 'overdue', now() - interval '10 days',
  '30000000-0000-4000-8000-000000000001'
);

insert into public.loan_items (
  id, loan_id, book_copy_id, borrowed_at, due_at, status
) values (
  '35000000-0000-4000-8000-000000000001',
  '34000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000002',
  now() - interval '10 days', now() - interval '3 days', 'overdue'
);

insert into public.reservations (
  id, reservation_number, member_id, book_title_id, status, expires_at
) values (
  '36000000-0000-4000-8000-000000000001', 'RES-REPORT-001',
  '31000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001', 'pending', now() + interval '1 day'
);

insert into public.visits (member_id, card_number_snapshot)
values ('31000000-0000-4000-8000-000000000001', 'CARD-REPORT-001');

insert into public.fines (
  id, member_id, loan_item_id, fine_type, amount, paid_amount, status
) values (
  '37000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  'overdue', 5000, 1000, 'partial'
);

insert into public.digital_collections (
  id, title, slug, media_type, file_path, is_published, published_at
) values (
  '38000000-0000-4000-8000-000000000001', 'Digital Report', 'digital-report',
  'ebook', 'digital/report.pdf', true, now()
);

insert into public.digital_access_logs (
  digital_collection_id, user_id, action
) values (
  '38000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001', 'view'
);

do $$
declare
  k public.v_dashboard_kpis%rowtype;
  v_daily_count integer;
  v_digital_count integer;
begin
  select * into strict k from public.v_dashboard_kpis;
  if k.total_titles <> 1 or k.total_copies <> 4 or k.available_copies <> 1
     or k.loaned_copies <> 1 or k.pending_reservations <> 1
     or k.overdue_items <> 1 or k.damaged_copies <> 1 or k.lost_copies <> 1
     or k.visits_today <> 1 or k.outstanding_fines <> 4000 then
    raise exception 'dashboard KPI calculation is incorrect: %', row_to_json(k);
  end if;

  select count(*) into v_daily_count from public.v_daily_loans;
  if v_daily_count <> 1 then raise exception 'daily loan view must aggregate one day'; end if;

  select count(*) into v_digital_count from public.v_digital_activity_daily
  where total_actions = 1 and unique_users = 1;
  if v_digital_count <> 1 then raise exception 'digital activity aggregation is incorrect'; end if;
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}';

do $$
declare
  v_settings integer;
begin
  select count(*) into v_settings from public.library_settings;
  if v_settings <> 0 then
    raise exception 'non-master authenticated users must not read library settings';
  end if;
end;
$$;

rollback;
