"use client";
import { useMemo, useState } from "react";
import { Save, ChevronDown } from "lucide-react";
import { Clan, CupGroup, CupGroupClan, CupMatch } from "@/lib/types";
import { cupGroupStandings, GROUP_NAMES } from "@/lib/cup";
import { SectionCard } from "./ui";

function GroupTable({ group, groupClans, cupMatches, allClans, editable, onSave }:
  { group: CupGroup; groupClans: CupGroupClan[]; cupMatches: CupMatch[];
    allClans: Clan[]; editable: boolean;
    onSave?: (id: string, hs: number, as_: number) => void }) {

  const clanIds = groupClans.filter(gc => gc.group_id === group.id).map(gc => gc.clan_id);
  const myMatches = cupMatches.filter(m => m.group_id === group.id);
  const rows = cupGroupStandings(clanIds, myMatches, allClans);
  const [open, setOpen] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { h?: string; a?: string }>>({});

  return (
    <SectionCard className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3">
        <span className="font-ar font-bold text-sm flex items-center gap-2">
          <span className="w-6 h-6 rounded-md grid place-items-center text-xs font-data font-bold"
            style={{ background: "var(--accent-soft)", color: "var(--accent-hi)", border: "1px solid var(--accent-line)" }}>
            {group.name}
          </span>
          المجموعة {group.name}
        </span>
        <ChevronDown size={15} style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 200ms" }} />
      </button>

      {open && <>
        {/* Standings */}
        <div style={{ borderTop: "1px solid var(--hairline)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--hairline)" }}>
                <th className="py-2 pl-3 text-left font-display text-[9px] uppercase tracking-widest">#</th>
                <th className="py-2 px-2 text-left font-display text-[9px] uppercase tracking-widest">الكلان</th>
                <th className="py-2 px-1 text-center font-display text-[9px] uppercase tracking-widest">ل</th>
                <th className="py-2 px-1 text-center font-display text-[9px] uppercase tracking-widest">ف</th>
                <th className="py-2 px-1 text-center font-display text-[9px] uppercase tracking-widest">ت</th>
                <th className="py-2 px-1 text-center font-display text-[9px] uppercase tracking-widest">خ</th>
                <th className="py-2 px-1 text-center font-display text-[9px] uppercase tracking-widest">+/-</th>
                <th className="py-2 pr-3 text-center font-display text-[9px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>نقاط</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const advances = i < group.qualifiers_count;
                const clan = allClans.find(c => c.id === r.id);
                return (
                  <tr key={r.id} style={{
                    borderBottom: i < rows.length-1 ? "1px solid var(--hairline)" : "none",
                    background: advances ? "var(--accent-soft)" : undefined,
                  }}>
                    <td className="py-2 pl-3 font-data" style={{ color: advances ? "var(--accent-hi)" : "var(--muted)" }}>{i+1}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {clan?.logo_url
                          ? <img src={clan.logo_url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
                          : <span className="w-5 h-5 rounded-full shrink-0 grid place-items-center text-[7px] font-bold"
                              style={{ background: "var(--panel-hi)", color: "var(--muted)" }}>{r.tag.slice(0,3)}</span>}
                        <span className="truncate font-semibold" style={{ color: advances ? "var(--accent-hi)" : "var(--parchment)" }}>{r.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center font-data">{r.mp}</td>
                    <td className="py-2 px-1 text-center font-data">{r.w}</td>
                    <td className="py-2 px-1 text-center font-data">{r.d}</td>
                    <td className="py-2 px-1 text-center font-data">{r.l}</td>
                    <td className="py-2 px-1 text-center font-data">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="py-2 pr-3 text-center font-data font-bold" style={{ color: advances ? "var(--accent-hi)" : "var(--accent)" }}>{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Matches */}
        <div style={{ borderTop: "1px solid var(--hairline)" }}>
          {myMatches.map((m, i) => {
            const home = allClans.find(c => c.id === m.home_clan_id);
            const away = allClans.find(c => c.id === m.away_clan_id);
            const d = drafts[m.id] || {};
            const hv = d.h ?? (m.home_score ?? "").toString();
            const av = d.a ?? (m.away_score ?? "").toString();
            const hw = m.played && (m.home_score ?? 0) > (m.away_score ?? 0);
            const aw = m.played && (m.away_score ?? 0) > (m.home_score ?? 0);
            return (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline)" }}>
                <span className="flex-1 text-right text-xs font-semibold truncate"
                  style={{ color: hw ? "var(--accent-hi)" : "var(--parchment)", fontWeight: hw ? 700 : 500 }}>
                  {home?.name ?? "—"}
                </span>
                {editable && !m.played
                  ? <div className="flex items-center gap-1 shrink-0">
                      <input type="number" min="0" value={hv}
                        onChange={e => setDrafts(d => ({...d,[m.id]:{...d[m.id],h:e.target.value}}))}
                        className="w-8 text-center font-data text-xs rounded py-0.5 bg-obsidian focus:outline-none"
                        style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
                      <span style={{ color: "var(--muted)" }}>:</span>
                      <input type="number" min="0" value={av}
                        onChange={e => setDrafts(d => ({...d,[m.id]:{...d[m.id],a:e.target.value}}))}
                        className="w-8 text-center font-data text-xs rounded py-0.5 bg-obsidian focus:outline-none"
                        style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
                      <button onClick={() => {
                        if (hv === "" || av === "") return;
                        onSave?.(m.id, Number(hv), Number(av));
                        setDrafts(d => { const c={...d}; delete c[m.id]; return c; });
                      }} className="p-1 rounded"
                        style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
                        <Save size={11} />
                      </button>
                    </div>
                  : <span className="font-data text-xs font-bold shrink-0 px-2 py-0.5 rounded"
                      style={{ background: m.played ? "var(--panel-hi)" : "transparent", border: m.played ? "1px solid var(--hairline)" : "none" }}>
                      {m.played ? `${m.home_score}–${m.away_score}` : "vs"}
                    </span>
                }
                <span className="flex-1 text-left text-xs font-semibold truncate"
                  style={{ color: aw ? "var(--accent-hi)" : "var(--parchment)", fontWeight: aw ? 700 : 500 }}>
                  {away?.name ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </>}
    </SectionCard>
  );
}

export default function CupGroupStage({ groups, groupClans, cupMatches, allClans, editable, onSaveGroupResult }:
  { groups: CupGroup[]; groupClans: CupGroupClan[]; cupMatches: CupMatch[];
    allClans: Clan[]; editable: boolean;
    onSaveGroupResult?: (id: string, hs: number, as_: number) => void }) {
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <GroupTable key={g.id} group={g} groupClans={groupClans}
          cupMatches={cupMatches} allClans={allClans}
          editable={editable} onSave={onSaveGroupResult} />
      ))}
    </div>
  );
}
