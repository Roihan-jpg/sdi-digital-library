begin;

insert into public.profiles (id, role, full_name)
values ('51000000-0000-4000-8000-000000000001', 'librarian', 'Librarian Idempotency');

insert into public.members (
  id, member_code, card_number, is_student, full_name, is_active
) values (
  '52000000-0000-4000-8000-000000000001',
  'DEMO-IDEMPOTENT', 'DEMO-CARD-IDEMPOTENT', false, 'Demo Idempotency', true
);

insert into public.book_titles (
  id, catalog_code, title, is_active, is_published
) values (
  '53000000-0000-4000-8000-000000000001',
  'DEMO-IDEMPOTENT-BOOK', 'Demo Buku Idempotency', true, true
);

insert into public.book_copies (
  id, book_title_id, inventory_code, status, condition, is_active
) values (
  '54000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  'DEMO-IDEMPOTENT-COPY', 'available', 'good', true
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}';

do $$
declare
  first_loan uuid;
  retried_loan uuid;
  loan_count integer;
begin
  first_loan := public.create_loan_by_codes(
    'DEMO-CARD-IDEMPOTENT',
    array['DEMO-IDEMPOTENT-COPY'],
    'first attempt',
    null,
    '55000000-0000-4000-8000-000000000001'
  );

  retried_loan := public.create_loan_by_codes(
    'DEMO-CARD-IDEMPOTENT',
    array['DEMO-IDEMPOTENT-COPY'],
    'first attempt',
    null,
    '55000000-0000-4000-8000-000000000001'
  );

  if first_loan is distinct from retried_loan then
    raise exception 'retry with the same key must return the original loan';
  end if;

  select count(*) into loan_count
  from public.loans
  where checkout_idempotency_key = '55000000-0000-4000-8000-000000000001';

  if loan_count <> 1 then
    raise exception 'idempotent retry must create exactly one loan, found %', loan_count;
  end if;

  begin
    perform public.create_loan_by_codes(
      'DEMO-CARD-IDEMPOTENT',
      array['DEMO-IDEMPOTENT-COPY'],
      'different request payload',
      null,
      '55000000-0000-4000-8000-000000000001'
    );
    raise exception 'reusing an idempotency key for a different payload must fail';
  exception
    when sqlstate '22023' then null;
  end;
end;
$$;

rollback;
