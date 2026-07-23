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
