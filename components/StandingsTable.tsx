"use client";

import Link from "next/link";
import { Clan, Match } from "@/lib/types";
import { computeStandings } from "@/lib/standings";
import { SectionCard } from "./ui";

function ClanMark({ logo, tag }: { logo: string | null; tag: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <span
      className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-data text-[9px] font-bold"
      style={{ background: "var(--panel-hi)", color: "var(--muted)" }}
    >
      {tag.slice(0, 3)}
    </span>
  );
}

export default function StandingsTable({
  clans,
  matches,
  division,
}: {
  clans: Clan[];
  matches: Match[];
  division: string;
}) {
  const rows = computeStandings(clans, matches);

  if (rows.length === 0) {
    return (
      <SectionCard className="p-10 text-center">
        <p style={{ color: "var(--muted)" }}>لسه مفيش كلانات في الدرجة دي.</p>
      </SectionCard>
    );
  }

  const th = "py-3 px-1.5 font-display text-[9px] uppercase tracking-[0.18em] font-semibold";

  return (
    <SectionCard className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--hairline)" }}>
            <th className={`${th} pl-4 text-left w-9`}>#</th>
            <th className={`${th} text-left`}>الكلان</th>
            <th className={`${th} text-center`}>لعب</th>
            <th className={`${th} text-center hidden sm:table-cell`}>ف</th>
            <th className={`${th} text-center hidden sm:table-cell`}>ت</th>
            <th className={`${th} text-center hidden sm:table-cell`}>خ</th>
            <th className={`${th} text-center hidden md:table-cell`}>له</th>
            <th className={`${th} text-center hidden md:table-cell`}>عليه</th>
            <th className={`${th} text-center`}>+/-</th>
            <th className={`${th} pr-4 text-center`} style={{ color: "var(--accent)" }}>
              نقاط
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const clan = clans.find((c) => c.id === r.id);
            const leader = i === 0;
            return (
              <tr
                key={r.id}
                style={{
                  borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--hairline)",
                  background: leader ? "var(--accent-soft)" : undefined,
                }}
              >
                <td className="py-2.5 pl-4">
                  {leader ? (
                    <span
                      className="seal-ring w-7 h-7 grid place-items-center font-data text-[11px] font-bold"
                      style={{ color: "var(--accent-hi)" }}
                    >
                      1
                    </span>
                  ) : (
                    <span className="font-data text-[11px] pl-2" style={{ color: "var(--muted)" }}>
                      {i + 1}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-1.5">
                  <Link
                    href={`/league/${division}/clan/${r.id}`}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    <ClanMark logo={clan?.logo_url ?? null} tag={r.tag} />
                    <span
                      className="text-[13px] font-semibold truncate underline-offset-4 hover:underline"
                      style={{ color: leader ? "var(--accent-hi)" : "var(--parchment)" }}
                    >
                      {r.name}
                    </span>
                  </Link>
                </td>
                <td className="py-2.5 px-1.5 text-center font-data text-xs">{r.mp}</td>
                <td className="py-2.5 px-1.5 text-center font-data text-xs hidden sm:table-cell">{r.w}</td>
                <td className="py-2.5 px-1.5 text-center font-data text-xs hidden sm:table-cell">{r.d}</td>
                <td className="py-2.5 px-1.5 text-center font-data text-xs hidden sm:table-cell">{r.l}</td>
                <td
                  className="py-2.5 px-1.5 text-center font-data text-xs hidden md:table-cell"
                  style={{ color: "var(--muted)" }}
                >
                  {r.gf}
                </td>
                <td
                  className="py-2.5 px-1.5 text-center font-data text-xs hidden md:table-cell"
                  style={{ color: "var(--muted)" }}
                >
                  {r.ga}
                </td>
                <td className="py-2.5 px-1.5 text-center font-data text-xs">
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </td>
                <td
                  className="py-2.5 pr-4 text-center font-data text-sm font-bold"
                  style={{ color: leader ? "var(--accent-hi)" : "var(--accent)" }}
                >
                  {r.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}
