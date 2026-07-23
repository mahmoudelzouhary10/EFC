export type DivisionKey = "first" | "second";

export type DivisionTheme = {
  key: DivisionKey;
  crest: string;
  nameAr: string;
  nameEn: string;
  /** primary accent */
  accent: string;
  /** lighter accent, for highlights and hover */
  accentHi: string;
  /** translucent accent fill */
  accentSoft: string;
  /** translucent accent border */
  accentLine: string;
  /** ambient radial wash behind the crest */
  wash: string;
};

export const DIVISION_THEMES: Record<DivisionKey, DivisionTheme> = {
  first: {
    key: "first",
    crest: "/logos/first.png",
    nameAr: "الدرجة الأولى",
    nameEn: "First Division",
    accent: "#E3B145",
    accentHi: "#F8E3A6",
    accentSoft: "rgba(227, 177, 69, 0.12)",
    accentLine: "rgba(227, 177, 69, 0.42)",
    wash: "rgba(227, 177, 69, 0.16)",
  },
  second: {
    key: "second",
    crest: "/logos/second.png",
    nameAr: "الدرجة الثانية",
    nameEn: "Second Division",
    accent: "#3E8FE0",
    accentHi: "#9CD2FF",
    accentSoft: "rgba(62, 143, 224, 0.12)",
    accentLine: "rgba(62, 143, 224, 0.42)",
    wash: "rgba(62, 143, 224, 0.16)",
  },
};

export function themeFor(key: string): DivisionTheme {
  return DIVISION_THEMES[(key as DivisionKey) in DIVISION_THEMES ? (key as DivisionKey) : "first"];
}

/** CSS custom properties to spread onto a wrapper element. */
export function themeVars(t: DivisionTheme): React.CSSProperties {
  return {
    ["--accent" as string]: t.accent,
    ["--accent-hi" as string]: t.accentHi,
    ["--accent-soft" as string]: t.accentSoft,
    ["--accent-line" as string]: t.accentLine,
    ["--wash" as string]: t.wash,
  };
}
