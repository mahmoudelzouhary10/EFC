import { Clan, CupGroup, CupGroupClan, CupMatch, CupRound } from "./types";
import { computeStandings } from "./standings";

// ── Layout constants used by CupBracket ──────────────────────────────────────
export const MW  = 148; // match card width
export const MH  = 70;  // match card height
export const QG  = 10;  // gap between QF matches in same pair
export const PG  = 20;  // gap between the two QF pairs
export const CW  = 28;  // connector arm width

// Derived y-centers (QF column)
export const QF_CY = [MH/2, MH + QG + MH/2, 2*(MH+QG) + PG + MH/2, 3*(MH+QG) + PG + MH/2];
// = [35, 115, 185+PG, 265+PG]  for MH=70, QG=10, PG=20 → [35, 115, 205, 285]
export const SF_CY = [(QF_CY[0]+QF_CY[1])/2, (QF_CY[2]+QF_CY[3])/2];
export const FI_CY = (SF_CY[0]+SF_CY[1])/2;
export const TOTAL_H = QF_CY[3] + MH/2; // bottom of last QF match

export const SF_X = MW + CW;
export const FI_X = SF_X + MW + CW;
export const CH_X = FI_X + MW + CW;

// QF top positions
export const QF_TOP = QF_CY.map(cy => cy - MH/2);
export const SF_TOP = SF_CY.map(cy => cy - MH/2);
export const FI_TOP = FI_CY - MH/2;

// SVG connector paths
export function svgPaths(stroke: string): string {
  const mid01 = (SF_X - CW/2);
  const mid23 = mid01;
  const midSF = (FI_X - CW/2);
  return [
    // QF1+QF2 → SF1
    `M${MW},${QF_CY[0]} H${mid01} V${QF_CY[1]} M${mid01},${SF_CY[0]} H${SF_X}`,
    // QF3+QF4 → SF2
    `M${MW},${QF_CY[2]} H${mid23} V${QF_CY[3]} M${mid23},${SF_CY[1]} H${SF_X}`,
    // SF1+SF2 → Final
    `M${SF_X+MW},${SF_CY[0]} H${midSF} V${SF_CY[1]} M${midSF},${FI_CY} H${FI_X}`,
    // Final → champion
    `M${FI_X+MW},${FI_CY} H${CH_X}`,
  ].join(" ");
}

// ── Group planning ────────────────────────────────────────────────────────────
export function planGroups(n: number): { numGroups: number; qualifiersPerGroup: number } {
  // Aim for exactly 8 qualifiers; try common formats
  const opts = [
    { numGroups: 4, qualifiersPerGroup: 2 },  // need ≥12 clans (3/group)
    { numGroups: 2, qualifiersPerGroup: 4 },  // need ≥10 clans (5/group)
    { numGroups: 8, qualifiersPerGroup: 1 },  // need ≥16 clans (2/group)
    { numGroups: 4, qualifiersPerGroup: 1 },  // fallback → 4 qualifiers
    { numGroups: 2, qualifiersPerGroup: 2 },  // fallback → 4 qualifiers
    { numGroups: 2, qualifiersPerGroup: 1 },  // last resort
  ];
  for (const o of opts) {
    if (n >= o.numGroups * (o.qualifiersPerGroup + 1)) return o;
  }
  return { numGroups: 2, qualifiersPerGroup: 1 };
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Distribute shuffled clan ids round-robin into N groups */
export function drawGroups(ids: string[], n: number): string[][] {
  const groups: string[][] = Array.from({ length: n }, () => []);
  shuffle(ids).forEach((id, i) => groups[i % n].push(id));
  return groups;
}

/** Single round-robin fixtures within a group */
export function groupFixtures(ids: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      pairs.push([ids[i], ids[j]]);
  return pairs;
}

// ── Group standings (reuses league engine) ───────────────────────────────────
export function cupGroupStandings(
  groupClanIds: string[],
  groupMatches: CupMatch[],
  allClans: Clan[]
) {
  const leagueClans = allClans.filter(c => groupClanIds.includes(c.id));
  const leagueMatches = groupMatches
    .filter(m => m.home_clan_id && m.away_clan_id)
    .map(m => ({
      id: m.id,
      division_id: "",
      matchday: m.matchday ?? 1,
      home_clan_id: m.home_clan_id!,
      away_clan_id: m.away_clan_id!,
      home_score: m.home_score,
      away_score: m.away_score,
      played: m.played,
      organizer_id: null,
    }));
  return computeStandings(leagueClans, leagueMatches);
}

// ── Qualifier seeding → knockout bracket ─────────────────────────────────────
/**
 * Takes ordered qualifiers (seed 1 first) and returns the 7 knockout slots.
 * Seeding: 1v8, 4v5, 2v7, 3v6 (standard bracket — 1 and 2 can only meet in Final)
 */
export function buildKnockoutSlots(
  seeded: string[]
): { slot: number; round: CupRound; home: string | null; away: string | null }[] {
  const s = (i: number) => seeded[i] ?? null;
  return [
    { slot: 1, round: "quarter_final", home: s(0), away: s(7) },
    { slot: 2, round: "quarter_final", home: s(3), away: s(4) },
    { slot: 3, round: "quarter_final", home: s(1), away: s(6) },
    { slot: 4, round: "quarter_final", home: s(2), away: s(5) },
    { slot: 5, round: "semi_final",    home: null, away: null },
    { slot: 6, round: "semi_final",    home: null, away: null },
    { slot: 7, round: "final",         home: null, away: null },
  ];
}

/** After a QF/SF match is won, which slot does the winner go to? */
export function advancesToSlot(slot: number): { targetSlot: number; isHome: boolean } | null {
  const map: Record<number, { targetSlot: number; isHome: boolean }> = {
    1: { targetSlot: 5, isHome: true  },
    2: { targetSlot: 5, isHome: false },
    3: { targetSlot: 6, isHome: true  },
    4: { targetSlot: 6, isHome: false },
    5: { targetSlot: 7, isHome: true  },
    6: { targetSlot: 7, isHome: false },
  };
  return map[slot] ?? null;
}

/** Get sorted qualifiers from groups (group rank → pts → gd → gf) */
export function getSeededQualifiers(
  groups: CupGroup[],
  groupClans: CupGroupClan[],
  cupMatches: CupMatch[],
  allClans: Clan[]
): string[] {
  // For each group get standings and take top qualifiers_count
  const byPosition: { clanId: string; rank: number; pts: number; gd: number; gf: number }[] = [];
  for (const g of groups) {
    const clanIds = groupClans.filter(gc => gc.group_id === g.id).map(gc => gc.clan_id);
    const gMatches = cupMatches.filter(m => m.group_id === g.id);
    const rows = cupGroupStandings(clanIds, gMatches, allClans);
    rows.slice(0, g.qualifiers_count).forEach((r, i) => {
      byPosition.push({ clanId: r.id, rank: i + 1, pts: r.pts, gd: r.gd, gf: r.gf });
    });
  }
  // Sort: rank asc, then pts desc, gd desc, gf desc
  byPosition.sort((a, b) =>
    a.rank - b.rank || b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
  );
  return byPosition.map(q => q.clanId);
}

export const GROUP_NAMES = ["أ","ب","ج","د","هـ","و","ز","ح"];
export const ROUND_AR: Record<CupRound, string> = {
  group: "دور المجموعات",
  quarter_final: "دور الـ8",
  semi_final: "نصف النهائي",
  final: "النهائي",
};
