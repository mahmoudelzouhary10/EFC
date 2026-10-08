import { Clan, Match } from "./types";

export type NewMatch = { matchday: number; home_clan_id: string; away_clan_id: string };

export type FillPlan =
  | {
      ok: true;
      matches: NewMatch[];
      newClanIds: string[];
      /** how many matches each new clan gets */
      perClan: Record<string, number>;
      /** unplayed matches of withdrawn clans that must be removed first */
      staleIds: string[];
    }
  | { ok: false; reason: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Fills the "holes" left in a running league after clans were replaced.
 *
 * A hole is a matchday in which an existing clan has no match, because its
 * opponent (a withdrawn clan) lost that fixture. The new clans take those
 * slots, so:
 *   - every matchday ends up complete again (5 matches for 10 clans),
 *   - nobody plays twice in a matchday,
 *   - a new clan never meets the same opponent more often than the league
 *     already does (once in a single round, twice in home & away),
 *   - the matches are spread as evenly as possible over the new clans.
 * Nothing that was already played or scheduled between existing clans moves.
 */
export function planFill(clans: Clan[], matches: Match[], attempts = 400): FillPlan {
  const active = clans.filter((c) => !c.withdrawn);
  const perDay = Math.floor(active.length / 2);
  if (active.length !== 10) {
    return { ok: false, reason: `لازم يكون في الدرجة 10 كلانات نشطة بالظبط (دلوقتي ${active.length}).` };
  }

  const withdrawnIds = new Set(clans.filter((c) => c.withdrawn).map((c) => c.id));
  const stale = matches.filter((m) => !m.played && (withdrawnIds.has(m.home_clan_id) || withdrawnIds.has(m.away_clan_id)));
  const staleIds = stale.map((m) => m.id);
  const staleSet = new Set(staleIds);
  const kept = matches.filter((m) => !staleSet.has(m.id));

  const activeIds = new Set(active.map((c) => c.id));
  const hasMatch = new Set<string>();
  kept.forEach((m) => {
    if (activeIds.has(m.home_clan_id)) hasMatch.add(m.home_clan_id);
    if (activeIds.has(m.away_clan_id)) hasMatch.add(m.away_clan_id);
  });
  const newIds = active.filter((c) => !hasMatch.has(c.id)).map((c) => c.id);
  const oldIds = active.filter((c) => hasMatch.has(c.id)).map((c) => c.id);
  if (newIds.length === 0) return { ok: false, reason: "مفيش كلانات جديدة محتاجة جدول." };

  // how often a pair already meets in this league (1 = single round, 2 = home & away)
  const pairCount = new Map<string, number>();
  kept.forEach((m) => pairCount.set(key(m.home_clan_id, m.away_clan_id), (pairCount.get(key(m.home_clan_id, m.away_clan_id)) ?? 0) + 1));
  const M = Math.max(1, ...Array.from(pairCount.values()));

  // analyse each matchday
  const days = Array.from(new Set(matches.map((m) => m.matchday))).sort((a, b) => a - b);
  type Day = { md: number; holes: string[]; need: number };
  const plan: Day[] = [];
  for (const md of days) {
    const dm = kept.filter((m) => m.matchday === md);
    const covered = new Set<string>();
    dm.forEach((m) => {
      covered.add(m.home_clan_id);
      covered.add(m.away_clan_id);
    });
    const missing = perDay - dm.length;
    const holes = oldIds.filter((id) => !covered.has(id));
    const need = 2 * missing - holes.length; // how many new clans must play this day
    const nnPairs = need - holes.length; // new clans left over after pairing with every hole
    if (missing < 0 || nnPairs < 0 || nnPairs % 2 !== 0 || need > newIds.length) {
      return { ok: false, reason: `الجولة ${md} فيها وضع مش متوقع (ماتشات ناقصة بشكل مش مفهوم). ابعتلي صورة للجولة دي.` };
    }
    if (missing > 0) plan.push({ md, holes, need });
  }
  if (plan.length === 0) return { ok: false, reason: "مفيش جولات فيها فراغات تتملى." };

  // ---- search for an assignment (randomised greedy + backtracking) ----
  let best: { picks: Record<number, [string, string][]>; spread: number; load: Record<string, number> } | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const load: Record<string, number> = Object.fromEntries(newIds.map((n) => [n, 0]));
    const pc = new Map<string, number>();
    const picks: Record<number, [string, string][]> = {};
    let failed = false;

    for (const day of shuffle(plan)) {
      let budget = 4000;
      const used = new Set<string>();
      const chosen: [string, string][] = [];
      const holes = shuffle(day.holes);

      const sortedFree = () => shuffle(newIds.filter((n) => !used.has(n))).sort((a, b) => load[a] - load[b]);

      const recNN = (remaining: number): boolean => {
        if (remaining === 0) return true;
        if (budget-- <= 0) return false;
        const free = sortedFree();
        for (let i = 0; i < free.length; i++) {
          for (let j = i + 1; j < free.length; j++) {
            const a = free[i], b = free[j];
            if ((pc.get(key(a, b)) ?? 0) >= M) continue;
            used.add(a); used.add(b);
            chosen.push([a, b]);
            load[a]++; load[b]++;
            pc.set(key(a, b), (pc.get(key(a, b)) ?? 0) + 1);
            if (recNN(remaining - 2)) return true;
            pc.set(key(a, b), (pc.get(key(a, b)) ?? 0) - 1);
            load[a]--; load[b]--;
            chosen.pop();
            used.delete(a); used.delete(b);
          }
        }
        return false;
      };

      const recHole = (i: number): boolean => {
        if (budget-- <= 0) return false;
        if (i === holes.length) return recNN(day.need - holes.length);
        const o = holes[i];
        for (const n of sortedFree()) {
          if ((pc.get(key(n, o)) ?? 0) >= M) continue;
          used.add(n);
          chosen.push([n, o]);
          load[n]++;
          pc.set(key(n, o), (pc.get(key(n, o)) ?? 0) + 1);
          if (recHole(i + 1)) return true;
          pc.set(key(n, o), (pc.get(key(n, o)) ?? 0) - 1);
          load[n]--;
          chosen.pop();
          used.delete(n);
        }
        return false;
      };

      if (!recHole(0)) {
        failed = true;
        break;
      }
      picks[day.md] = chosen.map((p) => [...p] as [string, string]);
    }

    if (failed) continue;
    const vals = Object.values(load);
    const spread = Math.max(...vals) - Math.min(...vals);
    if (!best || spread < best.spread) best = { picks, spread, load: { ...load } };
    if (best.spread <= 1) break;
  }

  if (!best) {
    return { ok: false, reason: "ماقدرتش أوزع الكلانات الجديدة على الفراغات بدون تكرار ماتشات. ابعتلي صورة لجدول الجولات." };
  }

  // ---- home / away: give home to whoever has had fewer home games ----
  const home: Record<string, number> = {};
  kept.forEach((m) => (home[m.home_clan_id] = (home[m.home_clan_id] ?? 0) + 1));
  const out: NewMatch[] = [];
  for (const md of Object.keys(best.picks).map(Number).sort((a, b) => a - b)) {
    for (const [a, b] of best.picks[md]) {
      const aHome = (home[a] ?? 0) <= (home[b] ?? 0);
      const [h, w] = aHome ? [a, b] : [b, a];
      home[h] = (home[h] ?? 0) + 1;
      out.push({ matchday: md, home_clan_id: h, away_clan_id: w });
    }
  }

  return { ok: true, matches: out, newClanIds: newIds, perClan: best.load, staleIds };
}
