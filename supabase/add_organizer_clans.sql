-- ============================================================================
-- Links each organizer to their own clan (if they have one), so the system
-- never puts an organizer on a match their own clan is playing.
-- Safe to run more than once.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

alter table organizers
  add column if not exists clan_id uuid references clans(id) on delete set null;

create index if not exists idx_organizers_clan on organizers(clan_id);

notify pgrst, 'reload schema';
