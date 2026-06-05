-- Project Vision — scenario persistence (Neon Postgres).
-- A "scenario" here is a full saved Plan/persona (the whole workspace state),
-- stored as JSONB and tied to a single lightweight user (the advisor's name).

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  identifier   text unique not null,            -- "Artur" or the funcional "i418426"
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists scenarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  client_id   text not null,                    -- app persona handle (load / recents)
  name        text not null,
  is_base     boolean not null default false,   -- base plan coming from the cadastro
  payload     jsonb not null,                   -- the complete Plan
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, client_id)                   -- idempotent upsert: one persona per user
);

create index if not exists idx_scenarios_user on scenarios(user_id);
create index if not exists idx_scenarios_user_updated on scenarios(user_id, updated_at desc);
