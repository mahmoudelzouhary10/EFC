"use client";

import { useMemo, useState } from "react";
import { Shuffle, ChevronDown, AlertTriangle, Eraser } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match, Organizer } from "@/lib/types";
import { assignMatchday, hasConflict, shuffle } from "@/lib/organizers";
import { SectionCard } from "./ui";

export default function MatchdayOrganizers({
  division,
  clans,
  matches,
  organizers,
  onChanged,
}: {
  division: Division;
  clans: Clan[];
  matches: Match[];
  organizers: Organizer[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [open, setOpen] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const matchdays = useMemo(() => {
    const g: Record<number, Match[]> = {};
    matches.forEach((m) => {
      (g[m.matchday] ||= []).push(m);
    });
    return Object.keys(g)
      .map(Number)
      .sort((a, b) => a - b)
      .map((md) => ({ md, matches: g[md] }));
  }, [matches]);

  /** workload across every match currently assigned, excluding one matchday */
  const loadExcluding = (skipDay: number | null) => {
    const load: Record<string, number> = {};
    matches.forEach((m) => {
      if (m.matchday === skipDay) return;
      if (m.organizer_id) load[m.organizer_id] = (load[m.organizer_id] || 0) + 1;
    });
    return load;
  };

  const persist = async (updates: { id: string; organizer_id: string | null }[]) => {
    setError(null);
    // group by organizer so this is a few requests, not one per match
    const groups: Record<string, string[]> = {};
    updates.forEach((u) => {
      const key = u.organizer_id ?? "__null__";
      (groups[key] ||= []).push(u.id);
    });
    for (const [key, ids] of Object.entries(groups)) {
      const { error } = await supabase
        .from("matches")
        .update({ organizer_id: key === "__null__" ? null : key })
        .in("id", ids);
      if (error) {
        setError(error.message);
        return false;
      }
    }
    return true;
  };

  const drawDay = async (md: number) => {
    if (organizers.length === 0) return;
    setBusyDay(md);
    const day = matchdays.find((d) => d.md === md);
    if (day) {
      const result = assignMatchday(day.matches, shuffle(organizers), loadExcluding(md));
      await persist(Object.entries(result).map(([id, organizer_id]) => ({ id, organizer_id })));
    }
    setBusyDay(null);
    onChanged();
  };

  const drawAll = async () => {
    if (organizers.length === 0) return;
    setBusyDay(-1);
    const load: Record<string, number> = {};
    const updates: { id: string; organizer_id: string | null }[] = [];
    for (const day of matchdays) {
      const result = assignMatchday(day.matches, shuffle(organizers), load);
      Object.entries(result).forEach(([id, organizer_id]) => updates.push({ id, organizer_id }));
    }
    await persist(updates);
    setBusyDay(null);
    onChanged();
  };

  const clearDay = async (md: number) => {
    setBusyDay(md);
    const day = matchdays.find((d) => d.md === md);
    if (day) {
      await persist(day.matches.map((m) => ({ id: m.id, organizer_id: null })));
    }
    setBusyDay(null);
    onChanged();
  };

  const setOne = async (matchId: string, organizerId: string) => {
    await persist([{ id: matchId, organizer_id: organizerId || null }]);
    onChanged();
  };

  const clanName = (id: string) => clans.find((c) => c.id === id)?.name ?? "—";

  if (matchdays.length === 0) {
    return (
      <SectionCard className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          اعمل جدول المباريات الأول.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-2.5">
      <SectionCard className="p-4">
        <h3 className="font-ar font-bold text-sm mb-1">توزيع الجولات — {division.name_ar}</h3>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
          كل جولة ليها قرعة لوحدها. تقدر تعيد قرعة جولة واحدة بس، أو تبدّل أي منظم بإيدك من القائمة
          جنب الماتش. المنظم اللي عنده كلان مش هيظهر أبدًا في ماتشات كلانه.
        </p>
        {error && (
          <p className="text-xs mb-2" style={{ color: "#E8737A" }}>
            {error}
          </p>
        )}
        <button
          disabled={organizers.length === 0 || busyDay !== null}
          onClick={drawAll}
          className="px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-line)",
            color: "var(--accent-hi)",
          }}
        >
          <Shuffle size={13} />
          {busyDay === -1 ? "…" : "قرعة لكل الجولات"}
        </button>
      </SectionCard>

      {matchdays.map(({ md, matches: dayMatches }) => {
        const isOpen = open === md;
        const assigned = dayMatches.filter((m) => m.organizer_id).length;
        return (
          <SectionCard key={md} className="overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-3">
              <button
                onClick={() => setOpen(isOpen ? undefined : md)}
                className="flex-1 flex items-center gap-2.5 min-w-0"
              >
                <span
                  className="font-data text-[11px] font-bold w-6 h-6 rounded-md grid place-items-center shrink-0"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-hi)",
                    border: "1px solid var(--accent-line)",
                  }}
                >
                  {md}
                </span>
                <span className="font-ar font-bold text-sm">الجولة {md}</span>
                <span className="font-data text-[10px]" style={{ color: "var(--muted)" }}>
                  {assigned}/{dayMatches.length}
                </span>
              </button>

              <button
                title="إعادة قرعة الجولة دي"
                disabled={organizers.length === 0 || busyDay !== null}
                onClick={() => drawDay(md)}
                className="p-2 rounded-lg shrink-0 disabled:opacity-40"
                style={{ border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}
              >
                <Shuffle size={13} />
              </button>
              <button
                title="مسح منظمين الجولة"
                disabled={busyDay !== null}
                onClick={() => clearDay(md)}
                className="p-2 rounded-lg shrink-0 disabled:opacity-40"
                style={{ border: "1px solid var(--hairline)", color: "var(--muted)" }}
              >
                <Eraser size={13} />
              </button>
              <button
                onClick={() => setOpen(isOpen ? undefined : md)}
                className="p-1.5 shrink-0"
                style={{ color: "var(--muted)" }}
              >
                <ChevronDown
                  size={15}
                  style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 200ms" }}
                />
              </button>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--hairline)" }}>
                {dayMatches.map((m, i) => {
                  const eligible = organizers.filter((o) => !hasConflict(o, m));
                  const noneAvailable = eligible.length === 0;
                  return (
                    <div
                      key={m.id}
                      className="px-3.5 py-3"
                      style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}
                    >
                      <p className="text-[12px] mb-2 truncate">
                        <span className="font-semibold">{clanName(m.home_clan_id)}</span>
                        <span style={{ color: "var(--muted)" }}> × </span>
                        <span className="font-semibold">{clanName(m.away_clan_id)}</span>
                      </p>

                      {noneAvailable ? (
                        <p
                          className="text-[10px] inline-flex items-center gap-1"
                          style={{ color: "#E8737A" }}
                        >
                          <AlertTriangle size={11} /> مفيش منظم متاح للماتش ده
                        </p>
                      ) : (
                        <select
                          value={m.organizer_id ?? ""}
                          onChange={(e) => setOne(m.id, e.target.value)}
                          className="w-full rounded-lg px-2.5 py-1.5 text-[13px] bg-obsidian focus:outline-none"
                          style={{
                            border: `1px solid ${m.organizer_id ? "var(--accent-line)" : "var(--hairline)"}`,
                            color: m.organizer_id ? "var(--accent-hi)" : "var(--muted)",
                          }}
                        >
                          <option value="">— مش متحدد —</option>
                          {eligible.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      )}
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
