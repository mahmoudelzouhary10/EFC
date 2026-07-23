"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import DivisionSwitcher from "@/components/DivisionSwitcher";
import ClanManager from "@/components/ClanManager";
import FixtureGenerator from "@/components/FixtureGenerator";
import FixturesList from "@/components/FixturesList";
import FederationSettingsPanel from "@/components/FederationSettings";
import { Pill } from "@/components/ui";

export default function AdminDivisionPage({ params }: { params: { division: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const divisionKey = params.division;

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [division, setDivision] = useState<Division | null>(null);
  const [clans, setClans] = useState<Clan[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<"clans" | "fixtures" | "results" | "settings">("clans");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: divs } = await supabase.from("divisions").select("*").order("key");
    setDivisions((divs as Division[]) || []);
    const current = divs?.find((d) => d.key === divisionKey) || null;
    setDivision(current);

    if (current) {
      const [{ data: clanRows }, { data: matchRows }] = await Promise.all([
        supabase.from("clans").select("*").eq("division_id", current.id).order("name"),
        supabase.from("matches").select("*").eq("division_id", current.id).order("matchday"),
      ]);
      setClans((clanRows as Clan[]) || []);
      setMatches((matchRows as Match[]) || []);
    }
    setLoading(false);
  }, [divisionKey, supabase]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveScore = async (matchId: string, homeScore: number, awayScore: number) => {
    const { error } = await supabase
      .from("matches")
      .update({ home_score: homeScore, away_score: awayScore, played: true, played_at: new Date().toISOString() })
      .eq("id", matchId);
    if (error) alert(error.message);
    loadAll();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (loading && !division) {
    return <div className="py-12 text-center text-slate-500 text-sm">Loading…</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-sm font-semibold text-slate-400">Admin Dashboard</h1>
        <button
          onClick={signOut}
          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-red-300 hover:border-red-400/40 text-xs font-semibold flex items-center gap-1.5"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {divisions.length > 0 && (
        <DivisionSwitcher divisions={divisions} active={divisionKey} basePath="/admin/dashboard" />
      )}

      <div className="flex gap-2 mb-4">
        <Pill active={tab === "clans"} onClick={() => setTab("clans")}>Clans</Pill>
        <Pill active={tab === "fixtures"} onClick={() => setTab("fixtures")}>Fixtures</Pill>
        <Pill active={tab === "results"} onClick={() => setTab("results")}>Results</Pill>
        <Pill active={tab === "settings"} onClick={() => setTab("settings")}>Settings</Pill>
      </div>

      {division && (
        <>
          {tab === "clans" && <ClanManager division={division} clans={clans} onChanged={loadAll} />}
          {tab === "fixtures" && (
            <div className="space-y-4">
              <FixtureGenerator division={division} clans={clans} matches={matches} onChanged={loadAll} />
              <FixturesList clans={clans} matches={matches} editable={false} />
            </div>
          )}
          {tab === "results" && (
            <FixturesList clans={clans} matches={matches} editable={true} onSaveScore={saveScore} />
          )}
          {tab === "settings" && <FederationSettingsPanel />}
        </>
      )}
    </>
  );
}
