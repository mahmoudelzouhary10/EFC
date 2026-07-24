"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import { themeFor, themeVars } from "@/lib/theme";
import DivisionSwitcher from "@/components/DivisionSwitcher";
import DivisionCrest from "@/components/DivisionCrest";
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
  const theme = themeFor(divisionKey);

  const loadAll = useCallback(async () => {
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
    setLoading(true);
    loadAll();
    const channel = supabase
      .channel(`league-${divisionKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "clans" }, loadAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll, supabase, divisionKey]);

  return (
    <div style={themeVars(theme)}>
      {divisions.length > 0 && (
        <DivisionSwitcher divisions={divisions} active={divisionKey} basePath="/league" />
      )}

      <DivisionCrest theme={theme} clanCount={clans.length} matchCount={matches.length} />

      <div className="flex gap-2 mb-4 justify-center">
        <Pill active={tab === "standings"} onClick={() => setTab("standings")}>
          الترتيب
        </Pill>
        <Pill active={tab === "fixtures"} onClick={() => setTab("fixtures")}>
          المباريات
        </Pill>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
          جاري التحميل…
        </p>
      ) : tab === "standings" ? (
        <StandingsTable clans={clans} matches={matches} division={divisionKey} />
      ) : (
        <FixturesList clans={clans} matches={matches} editable={false} division={divisionKey} />
      )}
    </div>
  );
}
