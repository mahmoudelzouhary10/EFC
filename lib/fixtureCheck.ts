import { Clan, Match } from "./types";

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** 1 = single round (9 matchdays), 2 = home & away (18 matchdays) */
export function repeatsPerPair(matches: Match[]): number {
  const days = new Set(matches.map((m) => m.matchday)).size;
  return days > 9 ? 2 : 1;
}

export function pairCounts(matches: Match[]): Map<string, number> {
  const map = new Map<string, number>();
  matches.forEach((m) => {
    const k = pairKey(m.home_clan_id, m.away_clan_id);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return map;
}

export type RoundReport = {
  /** clans that appear more than once in the round */
  dupClans: string[];
  /** active clans that have no match in the round */
  idle: string[];
  /** unplayed matches whose pairing already happens more often than allowed */
  dupPairMatchIds: string[];
  /** unplayed matches that still include a withdrawn clan */
  withdrawnMatchIds: string[];
  /** number of separate problems, 0 = round is fine */
  problems: number;
};

export function analyzeRound(
  roundMatches: Match[],
  clans: Clan[],
  counts: Map<string, number>,
  repeats: number
): RoundReport {
  const active = clans.filter((c) => !c.withdrawn);
  const withdrawn = new Set(clans.filter((c) => c.withdrawn).map((c) => c.id));

  const seen = new Map<string, number>();
  roundMatches.forEach((m) => {
    seen.set(m.home_clan_id, (seen.get(m.home_clan_id) ?? 0) + 1);
    seen.set(m.away_clan_id, (seen.get(m.away_clan_id) ?? 0) + 1);
  });

  const dupClans = Array.from(seen.entries()).filter(([, n]) => n > 1).map(([id]) => id);
  const idle = active.filter((c) => !seen.has(c.id)).map((c) => c.id);
  const dupPairMatchIds = roundMatches
    .filter((m) => !m.played && (counts.get(pairKey(m.home_clan_id, m.away_clan_id)) ?? 0) > repeats)
    .map((m) => m.id);
  const withdrawnMatchIds = roundMatches
    .filter((m) => !m.played && (withdrawn.has(m.home_clan_id) || withdrawn.has(m.away_clan_id)))
    .map((m) => m.id);

  return {
    dupClans,
    idle,
    dupPairMatchIds,
    withdrawnMatchIds,
    problems: dupClans.length + (idle.length > 0 ? 1 : 0) + dupPairMatchIds.length + withdrawnMatchIds.length,
  };
}

/**
 * Pairs up the clans that have no match in a round, avoiding any pairing
 * that already happens as often as the league allows. Returns null when no
 * valid pairing exists.
 */
export function autoComplete(
  idle: string[],
  counts: Map<string, number>,
  repeats: number
): [string, string][] | null {
  if (idle.length === 0 || idle.length % 2 !== 0) return null;
  let budget = 20000;

  const solve = (left: string[]): [string, string][] | null => {
    if (left.length === 0) return [];
    if (budget-- <= 0) return null;
    const [first, ...rest] = left;
    const order = [...rest].sort(() => Math.random() - 0.5);
    for (const partner of order) {
      if ((counts.get(pairKey(first, partner)) ?? 0) >= repeats) continue;
      const remaining = rest.filter((x) => x !== partner);
      const tail = solve(remaining);
      if (tail) return [[first, partner], ...tail];
    }
    return null;
  };

  return solve([...idle].sort(() => Math.random() - 0.5));
}
