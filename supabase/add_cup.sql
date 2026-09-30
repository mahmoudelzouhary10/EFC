-- ============================================================================
-- كأس مصر — Cup Schema
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

create table if not exists cups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'كأس مصر',
  season text not null default '2025/2026',
  status text not null default 'draft'
    check (status in ('draft','group_stage','knockout','finished')),
  created_at timestamptz default now()
);

create table if not exists cup_groups (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references cups(id) on delete cascade,
  name text not null,
  slot integer not null,
  qualifiers_count integer not null default 2
);

create table if not exists cup_group_clans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references cup_groups(id) on delete cascade,
  clan_id uuid not null references clans(id) on delete cascade,
  unique (group_id, clan_id)
);

create table if not exists cup_matches (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references cups(id) on delete cascade,
  group_id uuid references cup_groups(id),
  round text not null check (round in ('group','quarter_final','semi_final','final')),
  slot integer,
  matchday integer,
  home_clan_id uuid references clans(id),
  away_clan_id uuid references clans(id),
  home_score integer,
  away_score integer,
  played boolean not null default false,
  winner_id uuid references clans(id),
  created_at timestamptz default now()
);

create index if not exists idx_cup_matches_cup on cup_matches(cup_id);
create index if not exists idx_cup_gc_group on cup_group_clans(group_id);

alter table cups enable row level security;
alter table cup_groups enable row level security;
alter table cup_group_clans enable row level security;
alter table cup_matches enable row level security;

drop policy if exists "public read cups" on cups;
drop policy if exists "public read cup_groups" on cup_groups;
drop policy if exists "public read cup_group_clans" on cup_group_clans;
drop policy if exists "public read cup_matches" on cup_matches;
drop policy if exists "admin manage cups" on cups;
drop policy if exists "admin manage cup_groups" on cup_groups;
drop policy if exists "admin manage cup_group_clans" on cup_group_clans;
drop policy if exists "admin manage cup_matches" on cup_matches;

create policy "public read cups" on cups for select using (true);
create policy "public read cup_groups" on cup_groups for select using (true);
create policy "public read cup_group_clans" on cup_group_clans for select using (true);
create policy "public read cup_matches" on cup_matches for select using (true);
create policy "admin manage cups" on cups for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage cup_groups" on cup_groups for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage cup_group_clans" on cup_group_clans for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage cup_matches" on cup_matches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

do $$ begin
  alter publication supabase_realtime add table cups;
  alter publication supabase_realtime add table cup_matches;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
