"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Shuffle, Trash2, CheckCircle2, LogOut, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Cup, CupGroup, CupGroupClan, CupMatch } from "@/lib/types";
import { planGroups, drawGroups, groupFixtures, buildKnockoutSlots, advancesToSlot, getSeededQualifiers, GROUP_NAMES, ROUND_AR } from "@/lib/cup";
import CupGroupStage from "@/components/CupGroupStage";
import CupBracket from "@/components/CupBracket";
import { SectionCard } from "@/components/ui";

export default function AdminCupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [cup, setCup] = useState<Cup | null | undefined>(undefined);
  const [groups, setGroups] = useState<CupGroup[]>([]);
  const [groupClans, setGroupClans] = useState<CupGroupClan[]>([]);
  const [cupMatches, setCupMatches] = useState<CupMatch[]>([]);
  const [allClans, setAllClans] = useState<Clan[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [season, setSeason] = useState("2025/2026");
  const [cupName, setCupName] = useState("كأس مصر");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"groups"|"bracket">("bracket");

  const load = useCallback(async () => {
    const [{ data: cupRow }, { data: clansData }] = await Promise.all([
      supabase.from("cups").select("*").order("created_at",{ascending:false}).limit(1).single(),
      supabase.from("clans").select("*").order("name"),
    ]);
    setAllClans((clansData as Clan[]) || []);
    if (!cupRow) { setCup(null); return; }
    const c = cupRow as Cup;
    setCup(c);
    const [{ data: g }, { data: gc }, { data: cm }] = await Promise.all([
      supabase.from("cup_groups").select("*").eq("cup_id",c.id).order("slot"),
      supabase.from("cup_group_clans").select("*"),
      supabase.from("cup_matches").select("*").eq("cup_id",c.id).order("created_at"),
    ]);
    setGroups((g as CupGroup[]) || []);
    setGroupClans((gc as CupGroupClan[]) || []);
    setCupMatches((cm as CupMatch[]) || []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const createCup = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("cups").insert({ name: cupName, season, status: "draft" }).select().single();
    if (error) { setError(error.message); setBusy(false); return; }
    setCup(data as Cup); setBusy(false);
  };

  const doDraw = async () => {
    if (!cup || selectedIds.length < 4) return;
    setBusy(true); setError(null);
    await supabase.from("cup_groups").delete().eq("cup_id", cup.id);
    const { numGroups, qualifiersPerGroup } = planGroups(selectedIds.length);
    const distribution = drawGroups(selectedIds, numGroups);
    for (let i = 0; i < distribution.length; i++) {
      const { data: g } = await supabase.from("cup_groups")
        .insert({ cup_id: cup.id, name: GROUP_NAMES[i], slot: i+1, qualifiers_count: qualifiersPerGroup })
        .select().single();
      if (!g) continue;
      await supabase.from("cup_group_clans").insert(distribution[i].map(cid => ({ group_id: (g as CupGroup).id, clan_id: cid })));
      const fixtures = groupFixtures(distribution[i]);
      await supabase.from("cup_matches").insert(fixtures.map(([h,a],idx) => ({
        cup_id: cup.id, group_id: (g as CupGroup).id, round: "group", matchday: idx+1,
        home_clan_id: h, away_clan_id: a, played: false,
      })));
    }
    await supabase.from("cups").update({ status: "group_stage" }).eq("id", cup.id);
    setBusy(false); load();
  };

  const saveGroupResult = async (matchId: string, hs: number, as_: number) => {
    await supabase.from("cup_matches").update({ home_score: hs, away_score: as_, played: true }).eq("id", matchId);
    load();
  };

  const advanceToKnockout = async () => {
    if (!cup) return;
    setBusy(true);
    const seeded = getSeededQualifiers(groups, groupClans, cupMatches, allClans);
    const slots = buildKnockoutSlots(seeded);
    for (const r of ["quarter_final","semi_final","final"]) {
      await supabase.from("cup_matches").delete().eq("cup_id", cup.id).eq("round", r);
    }
    await supabase.from("cup_matches").insert(slots.map(s => ({
      cup_id: cup.id, group_id: null, round: s.round, slot: s.slot,
      home_clan_id: s.home, away_clan_id: s.away, played: false,
    })));
    await supabase.from("cups").update({ status: "knockout" }).eq("id", cup.id);
    setBusy(false); load(); setTab("bracket");
  };

  const saveKnockoutResult = async (matchId: string, hs: number, as_: number, winnerId: string) => {
    if (!cup) return;
    await supabase.from("cup_matches").update({ home_score: hs, away_score: as_, played: true, winner_id: winnerId }).eq("id", matchId);
    const match = cupMatches.find(m => m.id === matchId);
    if (match?.slot) {
      const next = advancesToSlot(match.slot);
      if (next) {
        const nextM = cupMatches.find(m => m.slot === next.targetSlot);
        if (nextM) await supabase.from("cup_matches").update(next.isHome ? { home_clan_id: winnerId } : { away_clan_id: winnerId }).eq("id", nextM.id);
      }
      if (match.slot === 7) await supabase.from("cups").update({ status: "finished" }).eq("id", cup.id);
    }
    load();
  };

  const deleteCup = async () => {
    if (!cup) return;
    await supabase.from("cups").delete().eq("id", cup.id);
    setCup(null); setGroups([]); setGroupClans([]); setCupMatches([]); setConfirmDelete(false);
  };

  const groupMatchesAll = cupMatches.filter(m => m.round === "group");
  const allGroupPlayed = groupMatchesAll.length > 0 && groupMatchesAll.every(m => m.played);
  const knockoutMatches = cupMatches.filter(m => m.round !== "group");
  const champion = allClans.find(c => c.id === knockoutMatches.find(m => m.slot === 7)?.winner_id);

  if (cup === undefined) return <p className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>جاري التحميل…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <a href="/cup" className="text-xs font-semibold" style={{ color: "var(--muted)" }}>← صفحة الكأس العامة</a>
        <div className="flex gap-2">
          <a href="/admin/dashboard" className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--hairline)", color: "var(--muted)" }}>الدوري</a>
          <button onClick={async()=>{ await supabase.auth.signOut(); router.push("/admin/login"); }}
            className="p-2 rounded-lg border text-xs" style={{ borderColor: "var(--hairline)", color: "var(--muted)" }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
          <Trophy size={18} style={{ color: "var(--accent-hi)" }} />
        </div>
        <div>
          <h1 className="font-ar font-black text-lg" style={{ color: "var(--accent-hi)" }}>{cup?.name ?? "كأس مصر"}</h1>
          {cup && <p className="text-[11px]" style={{ color: "var(--muted)" }}>موسم {cup.season}</p>}
        </div>
      </div>

      {cup === null && (
        <SectionCard className="p-4">
          <h3 className="font-ar font-bold text-sm mb-3">إنشاء البطولة</h3>
          <div className="space-y-2 mb-3">
            <input value={cupName} onChange={e => setCupName(e.target.value)} placeholder="اسم البطولة"
              className="w-full rounded-xl px-3 py-2 text-sm bg-obsidian focus:outline-none"
              style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
            <input value={season} onChange={e => setSeason(e.target.value)} placeholder="الموسم"
              className="w-full rounded-xl px-3 py-2 text-sm bg-obsidian focus:outline-none"
              style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
          </div>
          {error && <p className="text-xs mb-2" style={{ color: "#E8737A" }}>{error}</p>}
          <button onClick={createCup} disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-bold font-ar disabled:opacity-50"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
            {busy ? "…" : "إنشاء البطولة"}
          </button>
        </SectionCard>
      )}

      {cup?.status === "draft" && (
        <SectionCard className="p-4">
          <h3 className="font-ar font-bold text-sm mb-1">اختر الكلانات المشاركة</h3>
          <p className="text-[11px] mb-3" style={{ color: "var(--muted)" }}>
            {selectedIds.length} كلان مختار · السيستم بيحدد عدد المجموعات تلقائي
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
            {allClans.filter(c => !c.withdrawn).map(c => {
              const on = selectedIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => setSelectedIds(s => on ? s.filter(x=>x!==c.id) : [...s,c.id])}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left"
                  style={{ background: on ? "var(--accent-soft)" : "var(--panel-hi)", border: `1px solid ${on ? "var(--accent-line)" : "var(--hairline)"}` }}>
                  {c.logo_url && <img src={c.logo_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />}
                  <span className="text-sm font-semibold truncate" style={{ color: on ? "var(--accent-hi)" : "var(--parchment)" }}>{c.name}</span>
                  {on && <span className="ml-auto font-data text-[11px]" style={{ color: "var(--accent-hi)" }}>✓</span>}
                </button>
              );
            })}
          </div>
          <button onClick={doDraw} disabled={busy || selectedIds.length < 4}
            className="w-full py-2.5 rounded-xl text-sm font-bold font-ar flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
            <Shuffle size={14} /> {busy ? "جاري القرعة…" : `قرعة المجموعات (${selectedIds.length} كلان)`}
          </button>
        </SectionCard>
      )}

      {cup?.status === "group_stage" && (
        <div className="space-y-4">
          <CupGroupStage groups={groups} groupClans={groupClans} cupMatches={groupMatchesAll}
            allClans={allClans} editable={true} onSaveGroupResult={saveGroupResult} />
          {allGroupPlayed && (
            <SectionCard className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
                <span className="font-ar font-bold text-sm">كل مباريات المجموعات انتهت</span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: "var(--muted)" }}>
                السيستم هيختار أفضل {groups[0]?.qualifiers_count ?? 2} من كل مجموعة ويبني البراكيت.
              </p>
              <button onClick={advanceToKnockout} disabled={busy}
                className="w-full py-2.5 rounded-xl font-ar font-bold text-sm disabled:opacity-50"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
                {busy ? "…" : "الانتقال للدور الإقصائي ←"}
              </button>
            </SectionCard>
          )}
        </div>
      )}

      {(cup?.status === "knockout" || cup?.status === "finished") && (
        <div className="space-y-4">
          {cup.status === "finished" && champion && (
            <SectionCard className="p-5 text-center">
              <Trophy size={24} className="mx-auto mb-2" style={{ color: "var(--accent)" }} />
              {champion.logo_url && <img src={champion.logo_url} className="w-14 h-14 rounded-full object-cover mx-auto mb-2" alt="" />}
              <p className="font-ar font-black text-xl" style={{ color: "var(--accent-hi)" }}>{champion.name}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>بطل {cup.name} {cup.season}</p>
            </SectionCard>
          )}
          <div className="flex gap-2">
            {(["bracket","groups"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border"
                style={tab === t
                  ? { background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }
                  : { border: "1px solid var(--hairline)", color: "var(--muted)" }}>
                {t === "bracket" ? "البراكيت" : "المجموعات"}
              </button>
            ))}
          </div>
          {tab === "bracket"
            ? <div className="pt-6"><CupBracket slots={knockoutMatches} clans={allClans}
                editable={cup.status === "knockout"} onSaveResult={saveKnockoutResult} /></div>
            : <CupGroupStage groups={groups} groupClans={groupClans} cupMatches={groupMatchesAll}
                allClans={allClans} editable={false} />
          }
        </div>
      )}

      {cup && (
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--hairline)" }}>
          {confirmDelete
            ? <div className="flex gap-2">
                <button onClick={deleteCup} className="flex-1 py-2 rounded-xl text-xs font-bold"
                  style={{ background: "rgba(232,115,122,0.12)", border: "1px solid rgba(232,115,122,0.4)", color: "#E8737A" }}>
                  تأكيد حذف البطولة
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl text-xs"
                  style={{ border: "1px solid var(--hairline)", color: "var(--muted)" }}>إلغاء</button>
              </div>
            : <button onClick={() => setConfirmDelete(true)} className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                style={{ border: "1px solid var(--hairline)", color: "var(--muted)" }}>
                <Trash2 size={13} /> حذف البطولة وبدء من الأول
              </button>
          }
        </div>
      )}
    </div>
  );
}
