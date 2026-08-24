create table public.digital_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  target_collection_id uuid references public.digital_collections(id) on delete cascade,
  operation text not null check (operation in ('create', 'update')),
  status text not null default 'pending' check (status in ('pending', 'finalizing', 'finalized', 'cancelled', 'expired')),
  main_path text,
  main_mime_type text,
  main_size_bytes bigint check (main_size_bytes is null or main_size_bytes >= 0),
  cover_path text,
  cover_mime_type text,
  cover_size_bytes bigint check (cover_size_bytes is null or cover_size_bytes >= 0),
  expires_at timestamptz not null,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (operation = 'create' and target_collection_id is null and main_path is not null)
    or (operation = 'update' and target_collection_id is not null)
  ),
  check (
    (status = 'finalized' and finalized_at is not null)
    or (status <> 'finalized' and finalized_at is null)
  )
);

create index digital_upload_sessions_pending_expiry_idx
  on public.digital_upload_sessions (expires_at)
  where status in ('pending', 'finalizing');

alter table public.digital_upload_sessions enable row level security;

revoke all on table public.digital_upload_sessions from anon, authenticated;
