"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, Save } from "lucide-react";
import { Clan, Match } from "@/lib/types";
import { SectionCard } from "./ui";

const clanById = (clans: Clan[], id: string) => clans.find((c) => c.id === id);

function Mark({ clan }: { clan?: Clan }) {
  if (clan?.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={clan.logo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <span
      className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-data text-[9px] font-bold"
      style={{ background: "var(--panel-hi)", color: "var(--muted)" }}
    >
      {(clan?.tag ?? "—").slice(0, 3)}
    </span>
  );
}

export default function FixturesList({
  clans,
  matches,
  editable = false,
  onSaveScore,
}: {
  clans: Clan[];
  matches: Match[];
  editable?: boolean;
  onSaveScore?: (matchId: string, homeScore: number, awayScore: number) => void;
}) {
  const matchdays = useMemo(() => {
    const groups: Record<number, Match[]> = {};
    matches.forEach((m) => {
      (groups[m.matchday] ||= []).push(m);
    });
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map((md) => ({ md, matches: groups[md] }));
  }, [matches]);

  const firstUnplayed = matchdays.find((g) => g.matches.some((m) => !m.played))?.md ?? matchdays[0]?.md;
  const [open, setOpen] = useState<number | undefined>(firstUnplayed);
  const [drafts, setDrafts] = useState<Record<string, { home?: string; away?: string }>>({});

  if (matchdays.length === 0) {
    return (
      <SectionCard className="p-10 text-center">
        <p style={{ color: "var(--muted)" }}>الجدول لسه ما اتعملش للدرجة دي.</p>
      </SectionCard>
    );
  }

  const setDraft = (id: string, field: "home" | "away", value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));

  const scoreInput =
    "w-11 text-center rounded-lg py-1.5 font-data text-sm bg-obsidian focus:outline-none";

  return (
    <div className="space-y-2.5">
      {matchdays.map(({ md, matches: dayMatches }) => {
        const isOpen = open === md;
        const done = dayMatches.every((m) => m.played);
        return (
          <SectionCard key={md} className="overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? undefined : md)}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="font-data text-[11px] font-bold w-6 h-6 rounded-md grid place-items-center"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-hi)",
                    border: "1px solid var(--accent-line)",
                  }}
                >
                  {md}
                </span>
                <span className="font-ar font-bold text-sm">الجولة {md}</span>
                {done && <Check size={13} style={{ color: "var(--accent)" }} />}
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: "var(--muted)",
                  transform: isOpen ? "rotate(180deg)" : undefined,
                  transition: "transform 200ms",
                }}
              />
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--hairline)" }}>
                {dayMatches.map((m, idx) => {
                  const home = clanById(clans, m.home_clan_id);
                  const away = clanById(clans, m.away_clan_id);
                  const d = drafts[m.id] || {};
                  const hv = d.home ?? (m.home_score ?? "").toString();
                  const av = d.away ?? (m.away_score ?? "").toString();
                  const hw = m.played && (m.home_score as number) > (m.away_score as number);
                  const aw = m.played && (m.away_score as number) > (m.home_score as number);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-3 sm:px-4 py-3"
                      style={{ borderTop: idx === 0 ? "none" : "1px solid var(--hairline)" }}
                    >
                      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                        <span
                          className="text-[13px] truncate text-right"
                          style={{
                            color: hw ? "var(--accent-hi)" : "var(--parchment)",
                            fontWeight: hw ? 700 : 500,
                          }}
                        >
                          {home?.name ?? "—"}
                        </span>
                        <Mark clan={home} />
                      </div>

                      {editable ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={hv}
                            onChange={(e) => setDraft(m.id, "home", e.target.value)}
                            className={scoreInput}
                            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
                          />
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={av}
                            onChange={(e) => setDraft(m.id, "away", e.target.value)}
                            className={scoreInput}
                            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}
                          />
                          <button
                            aria-label="حفظ النتيجة"
                            onClick={() => {
                              if (hv === "" || av === "" || !onSaveScore) return;
                              onSaveScore(m.id, Number(hv), Number(av));
                              setDrafts((prev) => {
                                const c = { ...prev };
                                delete c[m.id];
                                return c;
                              });
                            }}
                            className="p-2 rounded-lg"
                            style={{
                              background: "var(--accent-soft)",
                              border: "1px solid var(--accent-line)",
                              color: "var(--accent-hi)",
                            }}
                          >
                            <Save size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="shrink-0 px-1">
                          {m.played ? (
                            <span
                              className="font-data text-sm font-bold px-2.5 py-1 rounded-lg"
                              style={{
                                background: "var(--panel-hi)",
                                border: "1px solid var(--hairline)",
                              }}
                            >
                              {m.home_score}–{m.away_score}
                            </span>
                          ) : (
                            <span
                              className="font-display text-[9px] uppercase tracking-[0.2em] px-2"
                              style={{ color: "var(--muted)" }}
                            >
                              vs
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <Mark clan={away} />
                        <span
                          className="text-[13px] truncate"
                          style={{
                            color: aw ? "var(--accent-hi)" : "var(--parchment)",
                            fontWeight: aw ? 700 : 500,
                          }}
                        >
                          {away?.name ?? "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
