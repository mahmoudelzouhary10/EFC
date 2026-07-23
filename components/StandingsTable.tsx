"use client";

import { Trophy, Shield } from "lucide-react";
import { Clan, Match } from "@/lib/types";
import { computeStandings } from "@/lib/standings";
import { SectionCard } from "./ui";

function ClanLogo({ url }: { url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" />;
  }
  return (
    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
      <Shield size={11} className="text-slate-600" />
    </div>
  );
}

export default function StandingsTable({ clans, matches }: { clans: Clan[]; matches: Match[] }) {
  const rows = computeStandings(clans, matches);
  const logoById = Object.fromEntries(clans.map((c) => [c.id, c.logo_url]));

  return (
    <SectionCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/10">
              <th className="text-left py-3 pl-4 pr-2 font-medium">#</th>
              <th className="text-left py-3 px-2 font-medium">Clan</th>
              <th className="text-center py-3 px-2 font-medium">MP</th>
              <th className="text-center py-3 px-2 font-medium">W</th>
              <th className="text-center py-3 px-2 font-medium">D</th>
              <th className="text-center py-3 px-2 font-medium">L</th>
              <th className="text-center py-3 px-2 font-medium hidden sm:table-cell">GF</th>
              <th className="text-center py-3 px-2 font-medium hidden sm:table-cell">GA</th>
              <th className="text-center py-3 px-2 font-medium">GD</th>
              <th className="text-center py-3 pr-4 pl-2 font-semibold text-slate-300">Pts</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-white/5 last:border-0 ${
                  i === 0 ? "bg-amber-400/[0.06]" : i < 3 ? "bg-emerald-400/[0.03]" : ""
                }`}
              >
                <td className="py-2.5 pl-4 pr-2 text-left">
                  <span className={`inline-flex items-center gap-1 ${i === 0 ? "text-amber-300 font-semibold" : "text-slate-400"}`}>
                    {i === 0 && <Trophy size={12} className="shrink-0" />}
                    {i + 1}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-left font-sans">
                  <div className="flex items-center gap-2">
                    <ClanLogo url={logoById[r.id]} />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 tracking-wider">{r.tag}</span>
                    <span className="text-slate-100 font-medium truncate max-w-[110px] sm:max-w-none">{r.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300">{r.mp}</td>
                <td className="py-2.5 px-2 text-center text-slate-300">{r.w}</td>
                <td className="py-2.5 px-2 text-center text-slate-300">{r.d}</td>
                <td className="py-2.5 px-2 text-center text-slate-300">{r.l}</td>
                <td className="py-2.5 px-2 text-center text-slate-400 hidden sm:table-cell">{r.gf}</td>
                <td className="py-2.5 px-2 text-center text-slate-400 hidden sm:table-cell">{r.ga}</td>
                <td className="py-2.5 px-2 text-center text-slate-300">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="py-2.5 pr-4 pl-2 text-center font-bold text-emerald-300">{r.pts}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 font-sans">
                  No clans in this division yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
