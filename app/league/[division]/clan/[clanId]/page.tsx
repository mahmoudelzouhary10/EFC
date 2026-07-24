"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Clan, Division, Match } from "@/lib/types";
import { computeStandings } from "@/lib/standings";
import { themeFor, themeVars } from "@/lib/theme";
import { SectionCard } from "@/components/ui";

type Params = { division: string; clanId: string };

export default function ClanPage({ params }: { params: Params }) {
  const supabase = createClient();
  const theme = themeFor(params.division);

  const [clans, setClans] = useState<Clan[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: divs } = await supabase.from("divisions").select("*");
    const current = (divs as Division[] | null)?.find((d) => d.key === params.division);
    if (!current) {
      setLoading(false);
      return;
    }
    const [{ data: clanRows }, { data: matchRows }] = await Promise.all([
      supabase.from("clans").select("*").eq("division_id", current.id),
      supabase.from("matches").select("*").eq("division_id", current.id).order("matchday"),
    ]);
    setClans((clanRows as Clan[]) || []);
    setMatches((matchRows as Match[]) || []);
    setLoading(false);
  }, [params.division, supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`clan-${params.clanId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, supabase, params.clanId]);

  const clan = clans.find((c) => c.id === params.clanId);
  const table = computeStandings(clans, matches);
  const rank = table.findIndex((r) => r.id === params.clanId);
  const row = rank >= 0 ? table[rank] : null;

  const mine = matches.filter(
    (m) => m.home_clan_id === params.clanId || m.away_clan_id === params.clanId
  );
  const played = mine.filter((m) => m.played);
  const upcoming = mine.filter((m) => !m.played);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
        جاري التحميل…
      </p>
    );
  }

  if (!clan) {
    return (
      <div style={themeVars(theme)}>
        <SectionCard className="p-10 text-center">
          <p style={{ color: "var(--muted)" }}>الكلان ده مش موجود.</p>
          <Link
            href={`/league/${params.division}`}
            className="inline-block mt-4 text-sm font-semibold"
            style={{ color: "var(--accent-hi)" }}
          >
            رجوع للترتيب
          </Link>
        </SectionCard>
      </div>
    );
  }

  const stat = (label: string, value: string | number) => (
    <div className="text-center">
      <div className="font-data text-lg font-bold" style={{ color: "var(--parchment)" }}>
        {value}
      </div>
      <div
        className="font-display text-[8px] uppercase tracking-[0.18em] mt-0.5"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>
    </div>
  );

  const MatchRow = ({ m }: { m: Match }) => {
    const isHome = m.home_clan_id === params.clanId;
    const opp = clans.find((c) => c.id === (isHome ? m.away_clan_id : m.home_clan_id));
    const my = isHome ? m.home_score : m.away_score;
    const their = isHome ? m.away_score : m.home_score;

    let badge = { text: "—", color: "var(--muted)" };
    if (m.played && my !== null && their !== null) {
      if (my > their) badge = { text: "فوز", color: "#5FD08A" };
      else if (my < their) badge = { text: "خسارة", color: "#E8737A" };
      else badge = { text: "تعادل", color: "var(--muted)" };
    }

    return (
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <span
          className="font-data text-[10px] w-6 shrink-0 text-center"
          style={{ color: "var(--muted)" }}
        >
          {m.matchday}
        </span>

        {opp?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opp.logo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
        ) : (
          <span
            className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-data text-[9px] font-bold"
            style={{ background: "var(--panel-hi)", color: "var(--muted)" }}
          >
            {(opp?.tag ?? "—").slice(0, 3)}
          </span>
        )}

        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold truncate">{opp?.name ?? "—"}</span>
          <span
            className="font-display text-[8px] uppercase tracking-[0.18em]"
            style={{ color: "var(--muted)" }}
          >
            {isHome ? "Home" : "Away"}
          </span>
        </span>

        {m.played ? (
          <span className="flex items-center gap-2 shrink-0">
            <span
              className="font-data text-sm font-bold px-2.5 py-1 rounded-lg"
              style={{ background: "var(--panel-hi)", border: "1px solid var(--hairline)" }}
            >
              {my}–{their}
            </span>
            <span
              className="font-ar text-[10px] font-bold w-11 text-center"
              style={{ color: badge.color }}
            >
              {badge.text}
            </span>
          </span>
        ) : (
          <span
            className="font-display text-[9px] uppercase tracking-[0.2em] shrink-0 px-2"
            style={{ color: "var(--muted)" }}
          >
            قادمة
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={themeVars(theme)}>
      <Link
        href={`/league/${params.division}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4"
        style={{ color: "var(--muted)" }}
      >
        <ArrowRight size={14} />
        {theme.nameAr}
      </Link>

      {/* Crest + identity */}
      <section className="crest-enter flex flex-col items-center text-center pb-5">
        <div className="seal-ring p-2.5">
          {clan.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clan.logo_url}
              alt={clan.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <span
              className="w-20 h-20 rounded-full grid place-items-center font-data text-lg font-bold"
              style={{ background: "var(--panel-hi)", color: "var(--muted)" }}
            >
              {clan.tag}
            </span>
          )}
        </div>

        <h1 className="font-ar font-black text-2xl mt-3.5">{clan.name}</h1>
        {row && (
          <p
            className="font-display text-[10px] uppercase tracking-[0.28em] mt-1.5"
            style={{ color: "var(--accent-hi)" }}
          >
            Rank {rank + 1} · {row.pts} Pts
          </p>
        )}
      </section>

      {row && (
        <SectionCard className="px-4 py-4 mb-4">
          <div className="grid grid-cols-5 gap-1">
            {stat("لعب", row.mp)}
            {stat("فوز", row.w)}
            {stat("تعادل", row.d)}
            {stat("خسارة", row.l)}
            {stat("+/-", row.gd > 0 ? `+${row.gd}` : row.gd)}
          </div>
        </SectionCard>
      )}

      {/* Results */}
      <h2 className="font-ar font-bold text-sm mb-2 px-1">
        النتائج
        <span className="font-data text-xs mr-2" style={{ color: "var(--muted)" }}>
          {played.length}
        </span>
      </h2>
      <SectionCard className="overflow-hidden mb-5">
        {played.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            لسه ملعبش أي ماتش.
          </p>
        ) : (
          played.map((m, i) => (
            <div key={m.id} style={{ marginTop: i === 0 ? "-1px" : 0 }}>
              <MatchRow m={m} />
            </div>
          ))
        )}
      </SectionCard>

      {/* Upcoming */}
      <h2 className="font-ar font-bold text-sm mb-2 px-1">
        المباريات القادمة
        <span className="font-data text-xs mr-2" style={{ color: "var(--muted)" }}>
          {upcoming.length}
        </span>
      </h2>
      <SectionCard className="overflow-hidden">
        {upcoming.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            مفيش مباريات قادمة.
          </p>
        ) : (
          upcoming.map((m, i) => (
            <div key={m.id} style={{ marginTop: i === 0 ? "-1px" : 0 }}>
              <MatchRow m={m} />
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
