begin;

insert into public.school_years (id, name, is_active)
values ('49000000-0000-4000-8000-000000000001', 'TEST-CASCADE-2027', false);

insert into public.classes (id, school_year_id, grade_level, name)
values ('49000000-0000-4000-8000-000000000002', '49000000-0000-4000-8000-000000000001', 1, 'TEST-CASCADE-1');

insert into public.study_groups (id, class_id, name)
values ('49000000-0000-4000-8000-000000000003', '49000000-0000-4000-8000-000000000002', 'TEST-CASCADE-A');

delete from public.school_years
where id = '49000000-0000-4000-8000-000000000001';

do $$
begin
  if exists (select 1 from public.classes where id = '49000000-0000-4000-8000-000000000002')
     or exists (select 1 from public.study_groups where id = '49000000-0000-4000-8000-000000000003') then
    raise exception 'school year delete must cascade to classes and study groups';
  end if;
end;
$$;

rollback;
