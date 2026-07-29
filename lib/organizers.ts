import { Match, Organizer } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True when this organizer's own clan is playing in this match. */
export function hasConflict(organizer: Organizer, match: Match): boolean {
  if (!organizer.clan_id) return false;
  return match.home_clan_id === organizer.clan_id || match.away_clan_id === organizer.clan_id;
}

/**
 * Assigns organizers to the matches of ONE matchday.
 *
 * Rules, in order of priority:
 *  1. An organizer is never given a match their own clan is playing in.
 *  2. Within the matchday, nobody gets a second match until everyone eligible
 *     has had one.
 *  3. Ties are broken by whoever has the lightest overall workload so far,
 *     so totals stay level across the season.
 *
 * `loadSoFar` maps organizerId -> how many matches they already hold
 * elsewhere. Pass a shuffled organizer list for a randomised draw.
 */
export function assignMatchday(
  dayMatches: Match[],
  organizers: Organizer[],
  loadSoFar: Record<string, number> = {}
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const usedThisDay = new Set<string>();

  // Hardest matches first: the ones with the fewest eligible organizers.
  const order = [...dayMatches].sort((a, b) => {
    const ea = organizers.filter((o) => !hasConflict(o, a)).length;
    const eb = organizers.filter((o) => !hasConflict(o, b)).length;
    return ea - eb;
  });

  for (const m of order) {
    const eligible = organizers.filter((o) => !hasConflict(o, m));

    if (eligible.length === 0) {
      result[m.id] = null;
      continue;
    }

    // prefer organizers not yet used in this matchday
    const fresh = eligible.filter((o) => !usedThisDay.has(o.id));
    const pool = fresh.length > 0 ? fresh : eligible;

    // lightest workload wins
    const pick = pool.reduce((best, o) =>
      (loadSoFar[o.id] ?? 0) < (loadSoFar[best.id] ?? 0) ? o : best
    );

    result[m.id] = pick.id;
    usedThisDay.add(pick.id);
    loadSoFar[pick.id] = (loadSoFar[pick.id] ?? 0) + 1;
  }

  return result;
}
