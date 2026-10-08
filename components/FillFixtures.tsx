"use client";

import { useMemo, useState } from "react";
import { UserPlus, RefreshCw, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import { planFill, FillPlan } from "@/lib/fillFixtures";
import { SectionCard } from "./ui";

/**
 * Brings clans that replaced withdrawn ones into the running fixture list.
 * It only ADDS matches into the gaps. Nothing already played or scheduled
 * between existing clans is touched.
 */
export default function FillFixtures({
  division, clans, matches, onChanged,
}: {
  division: Division;
  clans: Clan[];
  matches: Match[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [plan, setPlan] = useState<FillPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = clans.filter((c) => !c.withdrawn);
  const inFixtures = useMemo(() => {
    const s = new Set<string>();
    matches.forEach((m) => { s.add(m.home_clan_id); s.add(m.away_clan_id); });
    return s;
  }, [matches]);
  const newOnes = active.filter((c) => !inFixtures.has(c.id));

  // only relevant once fixtures exist and some active clan has no matches
  if (matches.length === 0 || newOnes.length === 0) return null;

  const name = (id: string) => clans.find((c) => c.id === id)?.name ?? "—";
  const incomplete = active.length !== 10;

  const compute = () => {
    setError(null);
    setPlan(planFill(clans, matches));
  };

  const confirm = async () => {
    if (!plan || !plan.ok) return;
    setBusy(true);
    setError(null);
    if (plan.staleIds.length > 0) {
      const { error } = await supabase.from("matches").delete().in("id", plan.staleIds);
      if (error) { setError(error.message); setBusy(false); return; }
    }
    const rows = plan.matches.map((m) => ({
      division_id: division.id, matchday: m.matchday,
      home_clan_id: m.home_clan_id, away_clan_id: m.away_clan_id, played: false,
    }));
    const { error } = await supabase.from("matches").insert(rows);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setPlan(null);
    onChanged();
  };

  const byDay: Record<number, { h: string; a: string }[]> = {};
  if (plan?.ok) plan.matches.forEach((m) => (byDay[m.matchday] ||= []).push({ h: m.home_clan_id, a: m.away_clan_id }));

  return (
    <SectionCard className="p-4">
      <h3 className="font-ar font-bold text-sm flex items-center gap-2 mb-1.5">
        <UserPlus size={15} style={{ color: "var(--accent)" }} /> ضم الكلانات الجديدة للجدول
      </h3>
      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
        الكلانات دي لسه مالهاش ماتشات:{" "}
        <strong style={{ color: "var(--parchment)" }}>{newOnes.map((c) => c.name).join("، ")}</strong>.
        الأداة بتملى الجولات الفاضية بدل الكلانات اللي انسحبت، وبتوزّعهم على باقي الكلانات من غير ما تلمس
        أي ماتش اتلعب أو متجدول بين الكلانات القديمة.
      </p>

      {incomplete && (
        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#E8737A" }}>
          <AlertTriangle size={13} /> الدرجة فيها {active.length} كلان نشط. ضيف الكلانات الناقصة لحد ما يبقوا 10 الأول.
        </p>
      )}
      {error && <p className="text-xs mb-3" style={{ color: "#E8737A" }}>{error}</p>}
      {plan && !plan.ok && (
        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#E8737A" }}>
          <AlertTriangle size={13} /> {plan.reason}
        </p>
      )}

      {plan?.ok && (
        <div className="mb-3">
          <p className="text-xs mb-2" style={{ color: "var(--accent-hi)" }}>
            هيتضاف {plan.matches.length} ماتش:{" "}
            {plan.newClanIds.map((id) => `${name(id)} (${plan.perClan[id]})`).join(" · ")}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl p-2.5 space-y-2"
            style={{ background: "var(--panel-hi)", border: "1px solid var(--hairline)" }}>
            {Object.keys(byDay).map(Number).sort((a, b) => a - b).map((d) => (
              <div key={d}>
                <p className="font-ar font-bold text-[11px] mb-0.5" style={{ color: "var(--accent)" }}>الجولة {d}</p>
                {byDay[d].map((m, i) => (
                  <p key={i} className="text-[12px] truncate">{name(m.h)} <span style={{ color: "var(--muted)" }}>×</span> {name(m.a)}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {plan?.ok ? (
          <>
            <button onClick={confirm} disabled={busy}
              className="px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
              {busy ? "…" : "تأكيد وإضافة"}
            </button>
            <button onClick={compute} disabled={busy}
              className="px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }}>
              <RefreshCw size={12} /> غيّر التوزيع
            </button>
            <button onClick={() => setPlan(null)} className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>إلغاء</button>
          </>
        ) : (
          <button onClick={compute} disabled={incomplete}
            className="px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
            اعرض خطة التوزيع
          </button>
        )}
      </div>
    </SectionCard>
  );
}
