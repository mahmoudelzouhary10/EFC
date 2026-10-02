"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Check, Save } from "lucide-react";
import { Clan, CupGroup, CupMatch } from "@/lib/types";
import { SectionCard } from "./ui";

function Mark({ clan }: { clan?: Clan }) {
  if (clan?.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={clan.logo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />;
  }
  return (
    <span className="w-6 h-6 rounded-full shrink-0 grid place-items-center font-data text-[8px] font-bold"
      style={{ background: "var(--panel-hi)", color: "var(--muted)" }}>
      {(clan?.tag ?? "—").slice(0, 3)}
    </span>
  );
}

/** Group-stage matches laid out round by round: Round 1 of every group, then Round 2... */
export default function CupRounds({
  groups, cupMatches, allClans, editable = false, onSave,
}: {
  groups: CupGroup[];
  cupMatches: CupMatch[];
  allClans: Clan[];
  editable?: boolean;
  onSave?: (matchId: string, hs: number, as_: number) => void;
}) {
  const rounds = useMemo(() => {
    const g: Record<number, CupMatch[]> = {};
    cupMatches.forEach((m) => { (g[m.matchday ?? 1] ||= []).push(m); });
    return Object.keys(g).map(Number).sort((a, b) => a - b).map((r) => ({ r, matches: g[r] }));
  }, [cupMatches]);

  const firstOpen = rounds.find((x) => x.matches.some((m) => !m.played))?.r ?? rounds[0]?.r;
  const [open, setOpen] = useState<number | undefined>(firstOpen);
  const [drafts, setDrafts] = useState<Record<string, { h?: string; a?: string }>>({});

  if (rounds.length === 0) {
    return (
      <SectionCard className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>مفيش جولات لسه.</p>
      </SectionCard>
    );
  }

  const inputCls = "w-9 text-center font-data text-xs rounded py-1 bg-obsidian focus:outline-none";
  const inputStyle = { border: "1px solid var(--hairline)", color: "var(--parchment)" };

  return (
    <div className="space-y-2.5">
      {rounds.map(({ r, matches }) => {
        const isOpen = open === r;
        const done = matches.every((m) => m.played);
        return (
          <SectionCard key={r} className="overflow-hidden">
            <button onClick={() => setOpen(isOpen ? undefined : r)}
              className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2.5">
                <span className="font-data text-[11px] font-bold w-6 h-6 rounded-md grid place-items-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-hi)", border: "1px solid var(--accent-line)" }}>
                  {r}
                </span>
                <span className="font-ar font-bold text-sm">الجولة {r}</span>
                <span className="font-data text-[10px]" style={{ color: "var(--muted)" }}>
                  {matches.filter((m) => m.played).length}/{matches.length}
                </span>
                {done && <Check size={13} style={{ color: "var(--accent)" }} />}
              </span>
              <ChevronDown size={16} style={{ color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 200ms" }} />
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--hairline)" }}>
                {matches.map((m, i) => {
                  const home = allClans.find((c) => c.id === m.home_clan_id);
                  const away = allClans.find((c) => c.id === m.away_clan_id);
                  const grp = groups.find((g) => g.id === m.group_id);
                  const d = drafts[m.id] || {};
                  const hv = d.h ?? (m.home_score ?? "").toString();
                  const av = d.a ?? (m.away_score ?? "").toString();
                  const hw = m.played && (m.home_score ?? 0) > (m.away_score ?? 0);
                  const aw = m.played && (m.away_score ?? 0) > (m.home_score ?? 0);
                  return (
                    <div key={m.id} className="px-3 sm:px-4 py-2.5"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}>
                      <p className="text-center font-ar text-[10px] mb-1.5" style={{ color: "var(--muted)" }}>
                        المجموعة {grp?.name ?? "—"}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                          <span className="text-[13px] truncate text-right"
                            style={{ color: hw ? "var(--accent-hi)" : "var(--parchment)", fontWeight: hw ? 700 : 500 }}>
                            {home?.name ?? "—"}
                          </span>
                          <Mark clan={home} />
                        </div>

                        {editable ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <input type="number" min="0" inputMode="numeric" value={hv}
                              onChange={(e) => setDrafts((x) => ({ ...x, [m.id]: { ...x[m.id], h: e.target.value } }))}
                              className={inputCls} style={inputStyle} />
                            <input type="number" min="0" inputMode="numeric" value={av}
                              onChange={(e) => setDrafts((x) => ({ ...x, [m.id]: { ...x[m.id], a: e.target.value } }))}
                              className={inputCls} style={inputStyle} />
                            <button aria-label="حفظ النتيجة"
                              onClick={() => {
                                if (hv === "" || av === "") return;
                                onSave?.(m.id, Number(hv), Number(av));
                                setDrafts((x) => { const c = { ...x }; delete c[m.id]; return c; });
                              }}
                              className="p-1.5 rounded-lg"
                              style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
                              <Save size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-data text-sm font-bold shrink-0 px-2.5 py-1 rounded-lg"
                            style={{ background: m.played ? "var(--panel-hi)" : "transparent", border: m.played ? "1px solid var(--hairline)" : "none", color: m.played ? "var(--parchment)" : "var(--muted)" }}>
                            {m.played ? `${m.home_score}–${m.away_score}` : "vs"}
                          </span>
                        )}

                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <Mark clan={away} />
                          <span className="text-[13px] truncate"
                            style={{ color: aw ? "var(--accent-hi)" : "var(--parchment)", fontWeight: aw ? 700 : 500 }}>
                            {away?.name ?? "—"}
                          </span>
                        </div>
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
