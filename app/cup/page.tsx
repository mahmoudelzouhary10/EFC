"use client";
import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Cup, CupGroup, CupGroupClan, CupMatch } from "@/lib/types";
import CupGroupStage from "@/components/CupGroupStage";
import CupBracket from "@/components/CupBracket";
import { SectionCard } from "@/components/ui";

export default function CupPage() {
  const supabase = createClient();
  const [cup, setCup] = useState<Cup | null | undefined>(undefined);
  const [groups, setGroups] = useState<CupGroup[]>([]);
  const [groupClans, setGroupClans] = useState<CupGroupClan[]>([]);
  const [cupMatches, setCupMatches] = useState<CupMatch[]>([]);
  const [allClans, setAllClans] = useState<Clan[]>([]);
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

  useEffect(() => {
    load();
    const ch = supabase.channel("cup-public")
      .on("postgres_changes",{event:"*",schema:"public",table:"cup_matches"},load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  const groupMatches = cupMatches.filter(m => m.round === "group");
  const knockoutMatches = cupMatches.filter(m => m.round !== "group");
  const champion = allClans.find(c => c.id === knockoutMatches.find(m => m.slot === 7)?.winner_id);
  const inKnockout = cup?.status === "knockout" || cup?.status === "finished";

  if (cup === undefined) return <p className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>جاري التحميل…</p>;

  if (cup === null) return (
    <SectionCard className="p-10 text-center">
      <Trophy size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
      <p className="font-ar font-bold" style={{ color: "var(--muted)" }}>لسه مفيش بطولة موجودة.</p>
      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>راجع الأدمن عشان ينشئ البطولة.</p>
    </SectionCard>
  );

  return (
    <div>
      <div className="flex flex-col items-center text-center pb-5 pt-2">
        <div className="w-14 h-14 rounded-full grid place-items-center mb-3"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
          <Trophy size={24} style={{ color: "var(--accent-hi)" }} />
        </div>
        <h1 className="font-ar font-black text-2xl" style={{ color: "var(--accent-hi)" }}>{cup.name}</h1>
        <p className="text-xs mt-1 font-display uppercase tracking-widest" style={{ color: "var(--muted)" }}>موسم {cup.season}</p>
        {cup.status === "finished" && champion && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)" }}>
            {champion.logo_url && <img src={champion.logo_url} className="w-6 h-6 rounded-full object-cover" alt="" />}
            <span className="font-ar font-bold text-sm" style={{ color: "var(--accent-hi)" }}>🏆 {champion.name}</span>
          </div>
        )}
      </div>

      {cup.status === "group_stage" && (
        <CupGroupStage groups={groups} groupClans={groupClans} cupMatches={groupMatches}
          allClans={allClans} editable={false} />
      )}

      {inKnockout && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
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
            ? <div className="pt-6"><CupBracket slots={knockoutMatches} clans={allClans} editable={false} /></div>
            : <CupGroupStage groups={groups} groupClans={groupClans} cupMatches={groupMatches}
                allClans={allClans} editable={false} />
          }
        </div>
      )}
    </div>
  );
}
