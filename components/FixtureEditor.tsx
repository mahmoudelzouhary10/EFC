"use client";

import { useMemo, useState } from "react";
import { ChevronDown, AlertTriangle, Check, Trash2, ArrowLeftRight, Lock, Wand2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match, Organizer } from "@/lib/types";
import { analyzeRound, autoComplete, pairCounts, pairKey, repeatsPerPair } from "@/lib/fixtureCheck";
import { SectionCard } from "./ui";

const RED = "#E8737A";

export default function FixtureEditor({
  division, clans, matches, organizers, onChanged,
}: {
  division: Division;
  clans: Clan[];
  matches: Match[];
  organizers: Organizer[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState<number | undefined>(undefined);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<number | null>(null);
  const [addDraft, setAddDraft] = useState<Record<number, { h: string; a: string }>>({});

  const active = useMemo(() => clans.filter((c) => !c.withdrawn).sort((a, b) => a.name.localeCompare(b.name)), [clans]);
  const nameOf = (id: string) => {
    const c = clans.find((x) => x.id === id);
    return c ? c.name + (c.withdrawn ? " (منسحب)" : "") : "—";
  };

  const repeats = useMemo(() => repeatsPerPair(matches), [matches]);
  const counts = useMemo(() => pairCounts(matches), [matches]);

  const rounds = useMemo(() => {
    const g: Record<number, Match[]> = {};
    matches.forEach((m) => (g[m.matchday] ||= []).push(m));
    return Object.keys(g).map(Number).sort((a, b) => a - b).map((md) => ({
      md,
      matches: g[md],
      report: analyzeRound(g[md], clans, counts, repeats),
    }));
  }, [matches, clans, counts, repeats]);

  const problemRounds = rounds.filter((r) => r.report.problems > 0);
  const shown = onlyProblems ? problemRounds : rounds;

  // ---------- writes ----------
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setError(error.message);
    onChanged();
  };

  /** change one side of a match; drop the organizer if it is now their own clan's match */
  const setSide = (m: Match, side: "home" | "away", clanId: string) => {
    const home = side === "home" ? clanId : m.home_clan_id;
    const away = side === "away" ? clanId : m.away_clan_id;
    const org = organizers.find((o) => o.id === m.organizer_id);
    const clash = org?.clan_id && (org.clan_id === home || org.clan_id === away);
    return run(() =>
      supabase.from("matches").update({
        home_clan_id: home, away_clan_id: away, ...(clash ? { organizer_id: null } : {}),
      }).eq("id", m.id)
    );
  };

  const swap = (m: Match) =>
    run(() => supabase.from("matches").update({ home_clan_id: m.away_clan_id, away_clan_id: m.home_clan_id }).eq("id", m.id));

  const remove = (m: Match) => run(() => supabase.from("matches").delete().eq("id", m.id));

  const add = (md: number) => {
    const d = addDraft[md];
    if (!d?.h || !d?.a || d.h === d.a) return;
    setAddDraft((x) => ({ ...x, [md]: { h: "", a: "" } }));
    return run(() => supabase.from("matches").insert({
      division_id: division.id, matchday: md, home_clan_id: d.h, away_clan_id: d.a, played: false,
    }));
  };

  const complete = (md: number, idle: string[]) => {
    const pairs = autoComplete(idle, counts, repeats);
    if (!pairs) {
      setError("مفيش ترتيب للكلانات اللي مش بتلعب بدون تكرار ماتش. عدّل ماتش من الجولات التانية الأول، أو ضيف الماتشات بإيدك.");
      return;
    }
    return run(() => supabase.from("matches").insert(
      pairs.map(([h, a]) => ({ division_id: division.id, matchday: md, home_clan_id: h, away_clan_id: a, played: false }))
    ));
  };

  const clearUnplayed = (md: number) => {
    setConfirmClear(null);
    return run(() => supabase.from("matches").delete().eq("division_id", division.id).eq("matchday", md).eq("played", false));
  };

  const sel = "w-full rounded-lg px-2 py-1.5 text-[12px] bg-obsidian focus:outline-none";

  const Options = ({ md, current, others }: { md: number; current: string; others: Set<string> }) => (
    <>
      {!active.some((c) => c.id === current) && <option value={current}>{nameOf(current)}</option>}
      {active.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{others.has(c.id) && c.id !== current ? "  ⚠ بيلعب في الجولة" : ""}
        </option>
      ))}
    </>
  );

  return (
    <div className="space-y-3">
      <SectionCard className="p-4">
        <h3 className="font-ar font-bold text-sm mb-1">تعديل الجولات — {division.name_ar}</h3>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
          تقدر تغيّر أي كلان في أي ماتش لسه ما اتلعبش، تبدّل الاستضافة، تمسح ماتش أو تضيف ماتش. الماتشات
          اللي اتلعبت مقفولة. التغيير بيتحفظ فورًا. أي تحذير أحمر بيوريك كلان متكرر أو ناقص في الجولة.
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: problemRounds.length ? RED : "var(--accent-hi)" }}>
            {problemRounds.length
              ? `فيه ${problemRounds.length} جولة محتاجة تظبيط`
              : "كل الجولات سليمة ✓"}
          </p>
          {problemRounds.length > 0 && (
            <button onClick={() => setOnlyProblems((v) => !v)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--hairline)", color: onlyProblems ? "var(--accent-hi)" : "var(--muted)" }}>
              {onlyProblems ? "اعرض كل الجولات" : "اعرض المشاكل بس"}
            </button>
          )}
        </div>
        {error && <p className="text-xs mt-2" style={{ color: RED }}>{error}</p>}
      </SectionCard>

      {shown.map(({ md, matches: dm, report }) => {
        const isOpen = open === md;
        const playedCount = dm.filter((m) => m.played).length;
        const busyIds = new Set(dm.flatMap((m) => [m.home_clan_id, m.away_clan_id]));
        const ok = report.problems === 0;
        const draft = addDraft[md] ?? { h: "", a: "" };
        return (
          <SectionCard key={md} className="overflow-hidden">
            <button onClick={() => setOpen(isOpen ? undefined : md)}
              className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="flex items-center gap-2.5">
                <span className="font-data text-[11px] font-bold w-6 h-6 rounded-md grid place-items-center"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-hi)", border: "1px solid var(--accent-line)" }}>
                  {md}
                </span>
                <span className="font-ar font-bold text-sm">الجولة {md}</span>
                <span className="font-data text-[10px]" style={{ color: "var(--muted)" }}>
                  {dm.length} ماتش · {playedCount} اتلعب
                </span>
                {ok
                  ? <Check size={13} style={{ color: "var(--accent)" }} />
                  : <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: RED }}>
                      <AlertTriangle size={12} /> {report.problems}
                    </span>}
              </span>
              <ChevronDown size={16} style={{ color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 200ms" }} />
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--hairline)" }}>
                {(report.dupClans.length > 0 || report.idle.length > 0) && (
                  <div className="px-4 py-3 space-y-1.5" style={{ background: "rgba(232,115,122,0.06)", borderBottom: "1px solid var(--hairline)" }}>
                    {report.dupClans.length > 0 && (
                      <p className="text-[11px]" style={{ color: RED }}>
                        كلانات متكررة في الجولة: <strong>{report.dupClans.map(nameOf).join("، ")}</strong>
                      </p>
                    )}
                    {report.idle.length > 0 && (
                      <p className="text-[11px]" style={{ color: RED }}>
                        كلانات مالهاش ماتش في الجولة دي: <strong>{report.idle.map(nameOf).join("، ")}</strong>
                      </p>
                    )}
                  </div>
                )}

                {dm.map((m, i) => {
                  const dup = report.dupClans.includes(m.home_clan_id) || report.dupClans.includes(m.away_clan_id);
                  const dupPair = report.dupPairMatchIds.includes(m.id);
                  const wd = report.withdrawnMatchIds.includes(m.id);
                  const bad = dup || dupPair || wd;
                  const othersFor = (self: string) => {
                    const s = new Set<string>();
                    dm.forEach((x) => { if (x.id !== m.id) { s.add(x.home_clan_id); s.add(x.away_clan_id); } });
                    s.delete(self);
                    return s;
                  };
                  return (
                    <div key={m.id} className="px-3.5 py-3"
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid var(--hairline)",
                        background: bad ? "rgba(232,115,122,0.05)" : undefined,
                      }}>
                      {m.played ? (
                        <div className="flex items-center gap-2 text-[13px]">
                          <Lock size={12} style={{ color: "var(--muted)" }} />
                          <span className="flex-1 truncate">{nameOf(m.home_clan_id)}</span>
                          <span className="font-data font-bold px-2 py-0.5 rounded"
                            style={{ background: "var(--panel-hi)", border: "1px solid var(--hairline)" }}>
                            {m.home_score}–{m.away_score}
                          </span>
                          <span className="flex-1 truncate text-left">{nameOf(m.away_clan_id)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center">
                            <select value={m.home_clan_id} disabled={busy}
                              onChange={(e) => setSide(m, "home", e.target.value)}
                              className={sel}
                              style={{ border: `1px solid ${bad ? RED : "var(--hairline)"}`, color: "var(--parchment)" }}>
                              <Options md={md} current={m.home_clan_id} others={othersFor(m.home_clan_id)} />
                            </select>
                            <span className="text-[11px]" style={{ color: "var(--muted)" }}>×</span>
                            <select value={m.away_clan_id} disabled={busy}
                              onChange={(e) => setSide(m, "away", e.target.value)}
                              className={sel}
                              style={{ border: `1px solid ${bad ? RED : "var(--hairline)"}`, color: "var(--parchment)" }}>
                              <Options md={md} current={m.away_clan_id} others={othersFor(m.away_clan_id)} />
                            </select>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px]" style={{ color: RED }}>
                              {dupPair ? "المواجهة دي متكررة" : wd ? "فيه كلان منسحب" : dup ? "كلان متكرر في الجولة" : ""}
                            </span>
                            <span className="flex gap-1">
                              <button title="بدّل الاستضافة" disabled={busy} onClick={() => swap(m)}
                                className="p-1.5 rounded-lg" style={{ border: "1px solid var(--hairline)", color: "var(--muted)" }}>
                                <ArrowLeftRight size={12} />
                              </button>
                              <button title="امسح الماتش" disabled={busy} onClick={() => remove(m)}
                                className="p-1.5 rounded-lg" style={{ border: "1px solid var(--hairline)", color: RED }}>
                                <Trash2 size={12} />
                              </button>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* add a match */}
                <div className="px-3.5 py-3 space-y-2" style={{ borderTop: "1px solid var(--hairline)" }}>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
                    <select value={draft.h} onChange={(e) => setAddDraft((x) => ({ ...x, [md]: { ...draft, h: e.target.value } }))}
                      className={sel} style={{ border: "1px solid var(--hairline)", color: draft.h ? "var(--parchment)" : "var(--muted)" }}>
                      <option value="">كلان</option>
                      {active.map((c) => <option key={c.id} value={c.id}>{c.name}{busyIds.has(c.id) ? "  ⚠ بيلعب في الجولة" : ""}</option>)}
                    </select>
                    <span className="text-[11px]" style={{ color: "var(--muted)" }}>×</span>
                    <select value={draft.a} onChange={(e) => setAddDraft((x) => ({ ...x, [md]: { ...draft, a: e.target.value } }))}
                      className={sel} style={{ border: "1px solid var(--hairline)", color: draft.a ? "var(--parchment)" : "var(--muted)" }}>
                      <option value="">كلان</option>
                      {active.map((c) => <option key={c.id} value={c.id}>{c.name}{busyIds.has(c.id) ? "  ⚠ بيلعب في الجولة" : ""}</option>)}
                    </select>
                    <button disabled={busy || !draft.h || !draft.a || draft.h === draft.a} onClick={() => add(md)}
                      className="p-1.5 rounded-lg disabled:opacity-40"
                      style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {report.idle.length >= 2 && report.idle.length % 2 === 0 && (
                      <button disabled={busy} onClick={() => complete(md, report.idle)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                        style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
                        <Wand2 size={12} /> كمّل الجولة تلقائي
                      </button>
                    )}
                    {dm.some((m) => !m.played) && (
                      confirmClear === md ? (
                        <>
                          <button disabled={busy} onClick={() => clearUnplayed(md)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                            style={{ background: "rgba(232,115,122,0.15)", border: "1px solid rgba(232,115,122,0.4)", color: RED }}>
                            تأكيد مسح ماتشات الجولة اللي لسه
                          </button>
                          <button onClick={() => setConfirmClear(null)} className="text-[11px]" style={{ color: "var(--muted)" }}>إلغاء</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmClear(md)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ border: "1px solid var(--hairline)", color: "var(--muted)" }}>
                          امسح الماتشات اللي لسه ما اتلعبتش
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
