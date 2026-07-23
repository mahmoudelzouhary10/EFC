-- ============================================================================
-- Egyptian Clans Federation — eFootball League Manager
-- Run this whole file once in Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,          -- 'first' | 'second'
  name text not null,
  name_ar text not null,
  created_at timestamptz default now()
);

create table if not exists clans (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  name text not null,
  tag text not null,
  logo_url text,
  created_at timestamptz default now()
);

-- Single-row table holding the federation's own branding (name + logo)
create table if not exists federation_settings (
  id int primary key default 1,
  name_ar text not null default 'الاتحاد المصري للكلانات',
  name_en text not null default 'Egyptian Clans Federation',
  logo_url text,
  constraint federation_settings_singleton check (id = 1)
);

insert into federation_settings (id) values (1) on conflict (id) do nothing;

alter table federation_settings enable row level security;
drop policy if exists "public read federation settings" on federation_settings;
drop policy if exists "admin manage federation settings" on federation_settings;
create policy "public read federation settings" on federation_settings for select using (true);
create policy "admin manage federation settings" on federation_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage bucket for federation + clan logos (public read, admin-only write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "public read logos" on storage.objects;
drop policy if exists "admin upload logos" on storage.objects;
drop policy if exists "admin update logos" on storage.objects;
drop policy if exists "admin delete logos" on storage.objects;

create policy "public read logos" on storage.objects
  for select using (bucket_id = 'logos');
create policy "admin upload logos" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated');
create policy "admin update logos" on storage.objects
  for update using (bucket_id = 'logos' and auth.role() = 'authenticated');
create policy "admin delete logos" on storage.objects
  for delete using (bucket_id = 'logos' and auth.role() = 'authenticated');

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  matchday int not null,
  home_clan_id uuid references clans(id) on delete cascade,
  away_clan_id uuid references clans(id) on delete cascade,
  home_score int,
  away_score int,
  played boolean not null default false,
  played_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_clans_division on clans(division_id);
create index if not exists idx_matches_division on matches(division_id);
create index if not exists idx_matches_matchday on matches(division_id, matchday);

-- ---------------------------------------------------------------------------
-- Enforce max 10 clans per division
-- ---------------------------------------------------------------------------
create or replace function check_clan_limit() returns trigger as $$
begin
  if (select count(*) from clans where division_id = new.division_id) >= 10 then
    raise exception 'This division already has 10 clans (max reached).';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists clan_limit_trigger on clans;
create trigger clan_limit_trigger
before insert on clans
for each row execute function check_clan_limit();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Public (anon) role: read-only on everything.
--   Authenticated (admin) role: full read/write.
--   Only YOU should have an authenticated account (created in Supabase Auth).
-- ---------------------------------------------------------------------------
alter table divisions enable row level security;
alter table clans enable row level security;
alter table matches enable row level security;

drop policy if exists "public read divisions" on divisions;
drop policy if exists "public read clans" on clans;
drop policy if exists "public read matches" on matches;
drop policy if exists "admin manage divisions" on divisions;
drop policy if exists "admin manage clans" on clans;
drop policy if exists "admin manage matches" on matches;

create policy "public read divisions" on divisions for select using (true);
create policy "public read clans" on clans for select using (true);
create policy "public read matches" on matches for select using (true);

create policy "admin manage divisions" on divisions for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage clans" on clans for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage matches" on matches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Realtime (so public standings/fixtures update live when admin saves a score)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table clans;

-- ---------------------------------------------------------------------------
-- Seed the two divisions (safe to re-run)
-- ---------------------------------------------------------------------------
insert into divisions (key, name, name_ar)
values
  ('first', 'First Division', 'الدرجة الأولى'),
  ('second', 'Second Division', 'الدرجة الثانية')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Optional: seed 10 placeholder clans per division. Delete/rename freely
-- from Admin > Clans once you know the real clan names.
-- ---------------------------------------------------------------------------
do $$
declare
  first_id uuid := (select id from divisions where key = 'first');
  second_id uuid := (select id from divisions where key = 'second');
begin
  if (select count(*) from clans where division_id = first_id) = 0 then
    insert into clans (division_id, name, tag) values
      (first_id, 'Cairo Kings', 'CRK'),
      (first_id, 'Alexandria Eagles', 'ALX'),
      (first_id, 'Giza Titans', 'GZT'),
      (first_id, 'Luxor Lions', 'LXR'),
      (first_id, 'Aswan Hawks', 'ASW'),
      (first_id, 'Mansoura Wolves', 'MNS'),
      (first_id, 'Tanta Sphinx', 'TNT'),
      (first_id, 'Zagazig Panthers', 'ZAG'),
      (first_id, 'Ismailia Falcons', 'ISM'),
      (first_id, 'Suez Sharks', 'SUZ');
  end if;

  if (select count(*) from clans where division_id = second_id) = 0 then
    insert into clans (division_id, name, tag) values
      (second_id, 'Nile Warriors', 'NLW'),
      (second_id, 'Delta Strikers', 'DLT'),
      (second_id, 'Sinai Guardians', 'SIN'),
      (second_id, 'Fayoum Phoenix', 'FYM'),
      (second_id, 'Damietta Dragons', 'DMT'),
      (second_id, 'Assiut Comets', 'AST'),
      (second_id, 'Qena Raiders', 'QNA'),
      (second_id, 'Minya Vipers', 'MNY'),
      (second_id, 'Beni Suef Storm', 'BNS'),
      (second_id, 'Sohag Rangers', 'SHG');
  end if;
end $$;
