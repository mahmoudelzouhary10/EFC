-- ============================================================================
-- Adds match organizers (المنظمين) to an existing ECF database.
-- Safe to run more than once.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- 1) Organizers roster (shared across both divisions) --------------------------
create table if not exists organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table organizers enable row level security;

drop policy if exists "public read organizers" on organizers;
drop policy if exists "admin manage organizers" on organizers;

create policy "public read organizers" on organizers
  for select using (true);
create policy "admin manage organizers" on organizers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2) Link each match to the organizer responsible for it -----------------------
alter table matches
  add column if not exists organizer_id uuid references organizers(id) on delete set null;

create index if not exists idx_matches_organizer on matches(organizer_id);

-- 3) Realtime + schema refresh -------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table organizers;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
