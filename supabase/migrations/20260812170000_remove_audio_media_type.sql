-- Remove audio from the supported digital media contract.

begin;

drop view if exists public.v_digital_activity_daily;

create type public.digital_media_type_without_audio as enum (
  'ebook',
  'module',
  'video'
);

alter table public.digital_collections
  alter column media_type type public.digital_media_type_without_audio
  using media_type::text::public.digital_media_type_without_audio;

drop type public.digital_media_type;
alter type public.digital_media_type_without_audio rename to digital_media_type;

create view public.v_digital_activity_daily
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

revoke all on public.v_digital_activity_daily from public, anon, authenticated;
grant select on public.v_digital_activity_daily to service_role;

commit;
