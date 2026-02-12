-- Create activity sessions and participation tables

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  guild_id text,
  channel_id text not null,
  invite_code text,
  activity_app_id text,
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb
);

create table if not exists public.activity_participation (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.activity_sessions(id) on delete cascade,
  guild_id text,
  user_id text not null,
  join_at timestamptz not null default now(),
  leave_at timestamptz,
  duration_seconds integer,
  awarded boolean not null default false,
  award_amount numeric,
  metadata jsonb
);

create index if not exists idx_activity_sessions_channel on public.activity_sessions(channel_id);
create index if not exists idx_activity_participation_user on public.activity_participation(user_id);
create index if not exists idx_activity_participation_session on public.activity_participation(session_id);
