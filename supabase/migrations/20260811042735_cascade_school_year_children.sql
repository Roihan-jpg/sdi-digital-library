-- A school year owns its classes. Keep the existing class -> study_group
-- cascade, and make deleting a school year remove that master-data subtree.
-- Members intentionally remain: their class/rombel FKs use SET NULL so
-- circulation and identity history are not destroyed by master-data cleanup.
alter table public.classes
  drop constraint if exists classes_school_year_id_fkey;

alter table public.classes
  add constraint classes_school_year_id_fkey
  foreign key (school_year_id)
  references public.school_years(id)
  on delete cascade;
