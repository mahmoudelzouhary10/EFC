export type Division = {
  id: string;
  key: "first" | "second";
  name: string;
  name_ar: string;
};

export type Clan = {
  id: string;
  division_id: string;
  name: string;
  tag: string;
  logo_url: string | null;
};

export type FederationSettings = {
  id: number;
  name_ar: string;
  name_en: string;
  logo_url: string | null;
};

export type Match = {
  id: string;
  division_id: string;
  matchday: number;
  home_clan_id: string;
  away_clan_id: string;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  organizer_id: string | null;
};

export type Organizer = {
  id: string;
  name: string;
  /** the clan this organizer belongs to, if any — never assigned their own matches */
  clan_id: string | null;
};

export type StandingRow = {
  id: string;
  name: string;
  tag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

// ── Cup types ────────────────────────────────────────────────────────────────
export type CupStatus = 'draft' | 'group_stage' | 'knockout' | 'finished';
export type CupRound  = 'group' | 'quarter_final' | 'semi_final' | 'final';

export type Cup = {
  id: string;
  name: string;
  season: string;
  status: CupStatus;
};

export type CupGroup = {
  id: string;
  cup_id: string;
  name: string;   // أ، ب، ج، د
  slot: number;   // 1-based
  qualifiers_count: number;
};

export type CupGroupClan = {
  id: string;
  group_id: string;
  clan_id: string;
};

export type CupMatch = {
  id: string;
  cup_id: string;
  group_id: string | null;
  round: CupRound;
  slot: number | null;       // knockout: QF=1-4, SF=5-6, Final=7
  matchday: number | null;
  home_clan_id: string | null;
  away_clan_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played: boolean;
  winner_id: string | null;
};
