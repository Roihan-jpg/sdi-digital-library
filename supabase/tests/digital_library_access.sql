begin;

do $$
begin
  if has_table_privilege('anon', 'public.digital_collections', 'select') then
    raise exception 'anon must not read raw digital_collections rows';
  end if;
  if has_function_privilege(
    'anon',
    'public.record_digital_access(uuid, public.digital_action_type)',
    'execute'
  ) then
    raise exception 'anon must not execute record_digital_access';
  end if;
end;
$$;

insert into public.profiles (id, role, full_name)
values ('10000000-0000-4000-8000-000000000001', 'member', 'Member Digital');

insert into public.digital_collections (
  id,
  title,
  slug,
  media_type,
  file_path,
  mime_type,
  is_downloadable,
  is_published,
  published_at
) values
(
  '20000000-0000-4000-8000-000000000001',
  'Published test',
  'published-test',
  'ebook',
  'digital/test/published.pdf',
  'application/pdf',
  false,
  true,
  now()
),
(
  '20000000-0000-4000-8000-000000000002',
  'Unpublished test',
  'unpublished-test',
  'ebook',
  'digital/test/unpublished.pdf',
  'application/pdf',
  true,
  false,
  null
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

do $$
declare
  v_count integer;
begin
  if not public.record_digital_access(
    '20000000-0000-4000-8000-000000000001',
    'view'
  ) then
    raise exception 'first view must be logged';
  end if;

  if public.record_digital_access(
    '20000000-0000-4000-8000-000000000001',
    'view'
  ) then
    raise exception 'duplicate view inside five minutes must be throttled';
  end if;

  select count(*) into v_count
  from public.digital_access_logs
  where digital_collection_id = '20000000-0000-4000-8000-000000000001'
    and action = 'view';
  if v_count <> 1 then
    raise exception 'expected one access log, got %', v_count;
  end if;

  begin
    perform public.record_digital_access(
      '20000000-0000-4000-8000-000000000002',
      'view'
    );
    raise exception 'unpublished access must fail';
  exception when no_data_found then
    null;
  end;

  begin
    perform public.record_digital_access(
      '20000000-0000-4000-8000-000000000001',
      'download'
    );
    raise exception 'disabled download must fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
