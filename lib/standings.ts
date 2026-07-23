import { Clan, Match, StandingRow } from "./types";

/**
 * Computes the sorted league table for a set of clans given all recorded
 * matches. Sort order: Points desc, Goal Difference desc, Goals For desc,
 * then name (stable tiebreaker).
 */
export function computeStandings(clans: Clan[], matches: Match[]): StandingRow[] {
  const table: Record<string, StandingRow> = {};
  clans.forEach((c) => {
    table[c.id] = { id: c.id, name: c.name, tag: c.tag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });

  matches
    .filter((m) => m.played && m.home_score !== null && m.away_score !== null)
    .forEach((m) => {
      const h = table[m.home_clan_id];
      const a = table[m.away_clan_id];
      if (!h || !a) return;
      const hs = m.home_score as number;
      const as = m.away_score as number;

      h.mp++; a.mp++;
      h.gf += hs; h.ga += as;
      a.gf += as; a.ga += hs;

      if (hs > as) { h.w++; h.pts += 3; a.l++; }
      else if (hs < as) { a.w++; a.pts += 3; h.l++; }
      else { h.d++; a.d++; h.pts += 1; a.pts += 1; }
    });

  const rows = Object.values(table).map((r) => ({ ...r, gd: r.gf - r.ga }));
  rows.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name));
  return rows;
}
