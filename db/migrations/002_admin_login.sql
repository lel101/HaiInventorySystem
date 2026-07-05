create table if not exists admin_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token text primary key,
  user_id text not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

insert into admin_users (id, username, password_hash, created_at, updated_at)
values (
  'admin-default',
  'admin',
  'pbkdf2_sha256$100000$8507cc1fcc7b5ddc867350b856ca5bc7$f2da843b23d58a636999d70430245f00c16f0cf98459f4263c3bf32cca0c80ab',
  now(),
  now()
)
on conflict (username) do nothing;

create index if not exists idx_admin_sessions_user_id on admin_sessions(user_id);
create index if not exists idx_admin_sessions_expires_at on admin_sessions(expires_at);
