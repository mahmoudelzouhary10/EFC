"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronRight, CheckCircle2, Save, Shield } from "lucide-react";
import { Clan, Match } from "@/lib/types";
import { SectionCard } from "./ui";

const clanById = (clans: Clan[], id: string) => clans.find((c) => c.id === id);

function ClanLogo({ url }: { url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
      <Shield size={13} className="text-slate-600" />
    </div>
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
      <SectionCard className="p-8 text-center text-slate-500">
        Fixtures haven&apos;t been generated for this division yet.
      </SectionCard>
    );
  }

  const setDraft = (matchId: string, field: "home" | "away", value: string) => {
    setDrafts((d) => ({ ...d, [matchId]: { ...d[matchId], [field]: value } }));
  };

  return (
    <div className="space-y-3">
      {matchdays.map(({ md, matches: dayMatches }) => {
        const isOpen = open === md;
        const allPlayed = dayMatches.every((m) => m.played);
        return (
          <SectionCard key={md} className="overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? undefined : md)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-cyan-400" />
                <span className="font-semibold text-slate-200 text-sm">Matchday {md}</span>
                {allPlayed && <CheckCircle2 size={14} className="text-emerald-400" />}
              </div>
              {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
            </button>
            {isOpen && (
              <div className="border-t border-white/10 divide-y divide-white/5">
                {dayMatches.map((m) => {
                  const home = clanById(clans, m.home_clan_id);
                  const away = clanById(clans, m.away_clan_id);
                  const draft = drafts[m.id] || {};
                  const homeVal = draft.home ?? (m.home_score ?? "").toString();
                  const awayVal = draft.away ?? (m.away_score ?? "").toString();
                  const homeWin = m.played && (m.home_score as number) > (m.away_score as number);
                  const awayWin = m.played && (m.away_score as number) > (m.home_score as number);

                  return (
                    <div key={m.id} className="flex items-center gap-2 sm:gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                        <span className={`text-sm truncate ${homeWin ? "text-slate-100 font-semibold" : "text-slate-400"}`}>
                          {home?.name ?? "—"}
                        </span>
                        <ClanLogo url={home?.logo_url} />
                      </div>

                      {editable ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            value={homeVal}
                            onChange={(e) => setDraft(m.id, "home", e.target.value)}
                            className="w-12 text-center rounded-md bg-black/40 border border-white/15 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-400/60"
                          />
                          <span className="text-slate-600 text-xs">:</span>
                          <input
                            type="number"
                            min="0"
                            value={awayVal}
                            onChange={(e) => setDraft(m.id, "away", e.target.value)}
                            className="w-12 text-center rounded-md bg-black/40 border border-white/15 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-400/60"
                          />
                          <button
                            title="Save result"
                            onClick={() => {
                              if (homeVal === "" || awayVal === "" || !onSaveScore) return;
                              onSaveScore(m.id, Number(homeVal), Number(awayVal));
                              setDrafts((d) => {
                                const c = { ...d };
                                delete c[m.id];
                                return c;
                              });
                            }}
                            className="ml-1 p-1.5 rounded-md bg-emerald-400/10 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/20"
                          >
                            <Save size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="shrink-0 min-w-[64px] text-center">
                          {m.played ? (
                            <span className="font-mono text-sm px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-100">
                              {m.home_score} : {m.away_score}
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-slate-500 tracking-wide">vs</span>
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <ClanLogo url={away?.logo_url} />
                        <span className={`text-sm truncate ${awayWin ? "text-slate-100 font-semibold" : "text-slate-400"}`}>
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
