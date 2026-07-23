"use client";

import { useEffect, useState, useCallback } from "react";
import { Table2, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import DivisionSwitcher from "@/components/DivisionSwitcher";
import StandingsTable from "@/components/StandingsTable";
import FixturesList from "@/components/FixturesList";
import { Pill } from "@/components/ui";

export default function LeaguePage({ params }: { params: { division: string } }) {
  const supabase = createClient();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<"standings" | "fixtures">("standings");
  const [loading, setLoading] = useState(true);

  const divisionKey = params.division;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: divs } = await supabase.from("divisions").select("*").order("key");
    setDivisions((divs as Division[]) || []);

    const current = divs?.find((d) => d.key === divisionKey);
    if (!current) {
      setClans([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    const [{ data: clanRows }, { data: matchRows }] = await Promise.all([
      supabase.from("clans").select("*").eq("division_id", current.id).order("name"),
      supabase.from("matches").select("*").eq("division_id", current.id).order("matchday"),
    ]);

    setClans((clanRows as Clan[]) || []);
    setMatches((matchRows as Match[]) || []);
    setLoading(false);
  }, [divisionKey, supabase]);

  useEffect(() => {
    loadAll();
    // live-update standings & fixtures the instant an admin saves a result
    const channel = supabase
      .channel("public-league-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "clans" }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll, supabase]);

  return (
    <>
      {divisions.length > 0 && (
        <DivisionSwitcher divisions={divisions} active={divisionKey} basePath="/league" />
      )}

      <div className="flex gap-2 mb-4">
        <Pill active={tab === "standings"} onClick={() => setTab("standings")}>
          <span className="inline-flex items-center gap-1.5">
            <Table2 size={14} /> Standings
          </span>
        </Pill>
        <Pill active={tab === "fixtures"} onClick={() => setTab("fixtures")}>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={14} /> Fixtures
          </span>
        </Pill>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading…</div>
      ) : tab === "standings" ? (
        <StandingsTable clans={clans} matches={matches} />
      ) : (
        <FixturesList clans={clans} matches={matches} editable={false} />
      )}
    </>
  );
}
