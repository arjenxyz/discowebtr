-- Add system_mail_stars table to store per-user starred mails
create table if not exists system_mail_stars (
  mail_id text not null,
  user_id text not null,
  starred_at timestamptz default now(),
  primary key (mail_id, user_id)
);

create index if not exists idx_system_mail_stars_user on system_mail_stars (user_id);
