"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import { generateFixtures } from "@/lib/fixtures";
import { SectionCard } from "./ui";

export default function FixtureGenerator({
  division,
  clans,
  matches,
  onChanged,
}: {
  division: Division;
  clans: Clan[];
  matches: Match[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [confirming, setConfirming] = useState<"single" | "double" | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = clans.length === 10;
  const hasFixtures = matches.length > 0;

  const run = async (double: boolean) => {
    setBusy(true);
    // wipe existing fixtures/results for this division first
    await supabase.from("matches").delete().eq("division_id", division.id);

    const drafts = generateFixtures(clans.map((c) => c.id), double).map((d) => ({
      division_id: division.id,
      matchday: d.matchday,
      home_clan_id: d.home_clan_id,
      away_clan_id: d.away_clan_id,
      played: false,
    }));

    const { error } = await supabase.from("matches").insert(drafts);
    setBusy(false);
    setConfirming(null);
    if (error) alert(error.message);
    onChanged();
  };

  return (
    <SectionCard className="p-4">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-1">
        <RefreshCw size={15} className="text-cyan-400" /> Generate Fixtures
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        {ready ? "This division has 10 clans — ready to generate." : `Needs exactly 10 clans (currently ${clans.length}).`}
        {hasFixtures && " Regenerating clears all existing matches and results."}
      </p>
      <div className="flex flex-wrap gap-2">
        {(["single", "double"] as const).map((mode) => (
          <button
            key={mode}
            disabled={!ready || busy}
            onClick={() => (confirming === mode ? run(mode === "double") : setConfirming(mode))}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              !ready || busy
                ? "border-white/5 text-slate-600 cursor-not-allowed"
                : confirming === mode
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                : "border-white/10 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300"
            }`}
          >
            {confirming === mode
              ? busy
                ? "Generating…"
                : `Confirm: ${mode === "double" ? "Double" : "Single"} round-robin?`
              : mode === "double"
              ? "Double Round (Home & Away · 18 matchdays)"
              : "Single Round (9 matchdays)"}
          </button>
        ))}
        {confirming && !busy && (
          <button onClick={() => setConfirming(null)} className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200">
            Cancel
          </button>
        )}
      </div>
    </SectionCard>
  );
}
