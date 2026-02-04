-- Disc Nexus: Tam reset + yeniden kurulum SQL

create extension if not exists "pgcrypto";

-- Önce mevcut objeleri temizle
drop trigger if exists store_orders_metrics_trigger on public.store_orders;
drop trigger if exists promotions_metrics_trigger on public.promotions;
drop trigger if exists ai_scenarios_metrics_trigger on public.ai_scenarios;
drop trigger if exists ai_candidate_scores_metrics_trigger on public.ai_candidate_scores;
drop trigger if exists ai_case_runs_metrics_trigger on public.ai_case_runs;

drop function if exists public.touch_public_metrics();
drop function if exists public.refresh_public_metrics(uuid);

drop table if exists public.member_profiles cascade;
drop table if exists public.member_wallets cascade;
drop table if exists public.wallet_ledger cascade;
drop table if exists public.daily_earnings cascade;
drop table if exists public.member_daily_stats cascade;
drop table if exists public.server_daily_stats cascade;
drop table if exists public.member_overview_stats cascade;
drop table if exists public.server_overview_stats cascade;
drop table if exists public.store_items cascade;
drop table if exists public.web_audit_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.notification_reads cascade;
drop table if exists public.log_channel_configs cascade;
drop table if exists public.public_metrics cascade;
drop table if exists public.maintenance_flags cascade;
drop table if exists public.ai_case_runs cascade;
drop table if exists public.ai_candidate_scores cascade;
drop table if exists public.ai_scenarios cascade;
drop table if exists public.store_discounts cascade;
drop table if exists public.promotions cascade;
drop table if exists public.store_orders cascade;
drop table if exists public.users cascade;
drop table if exists public.servers cascade;

-- Tablo kurulumları
create table public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  discord_id text unique,
  avatar_url text,
  admin_role_id text, -- Admin rol ID'si
  verify_role_id text, -- Verify rol ID'si
  is_setup boolean not null default false,
  approval_threshold numeric not null default 80,
  transfer_daily_limit numeric not null default 200,
  transfer_tax_rate numeric not null default 0.05,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  username text not null,
  points integer not null default 0,
  role_level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_items (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null,
  status text not null check (status in ('active','inactive')),
  role_id text not null,
  duration_days integer not null check (duration_days >= 0),
  created_at timestamptz not null default now()
);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id text not null,
  item_id uuid references public.store_items(id) on delete set null,
  item_title text,
  role_id text not null,
  duration_days integer not null,
  expires_at timestamptz,
  applied_at timestamptz,
  revoked_at timestamptz,
  failure_reason text,
  amount numeric not null,
  status text not null check (status in ('paid','pending','refunded','failed')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  code text not null,
  value numeric not null,
  max_uses integer,
  used_count integer not null default 0,
  status text not null check (status in ('active','disabled','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.store_discounts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  code text not null,
  percent numeric not null,
  max_uses integer,
  used_count integer not null default 0,
  status text not null check (status in ('active','disabled','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_scenarios (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  title text not null,
  scenario_type text not null check (scenario_type in ('moderation','training')),
  status text not null default 'active',
  accuracy numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.ai_candidate_scores (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id text not null,
  accuracy numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table public.ai_case_runs (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.maintenance_flags (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  key text not null,
  is_active boolean not null default false,
  reason text,
  updated_by text,
  updated_at timestamptz not null default now(),
  unique (server_id, key)
);

create table public.log_channel_configs (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  channel_type text not null check (channel_type in ('main','auth','roles','system','suspicious','store','wallet','notifications','settings')),
  webhook_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, channel_type)
);

create table public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  about text,
  deleted_at timestamptz, -- Soft delete için
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create table public.member_wallets (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  balance numeric not null default 0,
  deleted_at timestamptz, -- Soft delete için
  updated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  amount numeric not null,
  type text not null check (type in ('earn_voice','earn_message','transfer_in','transfer_out','transfer_tax','purchase','admin_adjust','refund','promotion')),
  balance_after numeric,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz, -- Soft delete için
  created_at timestamptz not null default now()
);

create table public.daily_earnings (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  source text not null check (source in ('voice','message')),
  earning_date date not null,
  amount numeric not null default 0,
  settled_at timestamptz,
  deleted_at timestamptz, -- Soft delete için
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, user_id, source, earning_date)
);

create table public.member_daily_stats (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  stat_date date not null,
  message_count integer not null default 0,
  voice_minutes integer not null default 0,
  deleted_at timestamptz, -- Soft delete için
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, user_id, stat_date)
);

create table public.server_daily_stats (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  stat_date date not null,
  message_count integer not null default 0,
  voice_minutes integer not null default 0,
  deleted_at timestamptz, -- Soft delete için
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, stat_date)
);

create table public.member_overview_stats (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  user_id text not null,
  total_messages integer not null default 0,
  total_voice_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (guild_id, user_id)
);

create table public.server_overview_stats (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  total_messages integer not null default 0,
  total_voice_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (guild_id)
);

create table public.web_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  status text,
  user_id text,
  guild_id text,
  role_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.public_metrics (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  total_users integer not null default 0,
  active_users_24h integer not null default 0,
  total_messages integer not null default 0,
  total_voice_minutes integer not null default 0,
  total_wallet_balance numeric not null default 0,
  total_store_orders integer not null default 0,
  total_store_revenue numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (server_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null, -- Sunucu ID'si
  title text not null,
  body text not null,
  type text not null check (type in ('announcement','mail')),
  status text not null default 'published',
  target_user_id text,
  created_by text,
  author_name text,
  author_avatar_url text,
  details_url text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

create index log_channel_configs_guild_idx on public.log_channel_configs (guild_id);
create index log_channel_configs_type_idx on public.log_channel_configs (channel_type);
create index maintenance_flags_server_idx on public.maintenance_flags (server_id);
create index maintenance_flags_key_idx on public.maintenance_flags (key);

create index member_profiles_guild_idx on public.member_profiles (guild_id);
create index member_profiles_user_idx on public.member_profiles (user_id);

create index member_wallets_guild_idx on public.member_wallets (guild_id);
create index member_wallets_user_idx on public.member_wallets (user_id);
create index wallet_ledger_user_idx on public.wallet_ledger (user_id);
create index wallet_ledger_created_idx on public.wallet_ledger (created_at desc);
create index daily_earnings_date_idx on public.daily_earnings (earning_date);
create index daily_earnings_settled_idx on public.daily_earnings (settled_at);
create index member_daily_stats_user_idx on public.member_daily_stats (user_id);
create index member_daily_stats_date_idx on public.member_daily_stats (stat_date);
create index server_daily_stats_date_idx on public.server_daily_stats (stat_date);
create index member_overview_stats_user_idx on public.member_overview_stats (user_id);

create index store_items_server_idx on public.store_items (server_id);
create index store_items_status_idx on public.store_items (status);

create index store_orders_server_idx on public.store_orders (server_id);
create index store_orders_user_idx on public.store_orders (user_id);
create index store_orders_expires_idx on public.store_orders (expires_at);
create index store_orders_applied_idx on public.store_orders (applied_at);
create index store_orders_revoked_idx on public.store_orders (revoked_at);

create index web_audit_logs_event_idx on public.web_audit_logs (event);
create index web_audit_logs_user_idx on public.web_audit_logs (user_id);
create index web_audit_logs_created_idx on public.web_audit_logs (created_at desc);
create index notifications_status_idx on public.notifications (status);
create index notifications_created_idx on public.notifications (created_at desc);
create index notification_reads_user_idx on public.notification_reads (user_id);

-- İlk sunucu ve public metrics kaydı
insert into public.servers (name, slug, discord_id, approval_threshold)
values ('Disc Nexus', 'default', '000000000000000000', 80);

insert into public.public_metrics (server_id)
select id from public.servers where slug = 'default';



-- Public metrics herkes tarafından okunabilir
alter table public.public_metrics enable row level security;
create policy "public_metrics_read" on public.public_metrics
for select using (true);

alter table public.web_audit_logs enable row level security;

alter table public.log_channel_configs enable row level security;

alter table public.member_profiles enable row level security;

alter table public.member_wallets enable row level security;

alter table public.wallet_ledger enable row level security;

alter table public.daily_earnings enable row level security;

alter table public.notifications enable row level security;
create policy "notifications_read" on public.notifications
for select using (status = 'published');

-- Mevcut veritabanları için güvenli güncellemeler
alter table public.promotions add column if not exists max_uses integer;
alter table public.promotions add column if not exists used_count integer not null default 0;

alter table public.log_channel_configs drop constraint if exists log_channel_configs_channel_type_check;
alter table public.log_channel_configs
  add constraint log_channel_configs_channel_type_check
  check (channel_type in ('main','auth','roles','system','suspicious','store','wallet','notifications','settings'));

-- Realtime yayını (varsa eklemeyi dene)
do $$
begin
  alter publication supabase_realtime add table public.public_metrics;
exception
  when duplicate_object then null;
end $$;
