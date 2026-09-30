"use client";
import { useState } from "react";
import { Save, Trophy } from "lucide-react";
import { Clan, CupMatch } from "@/lib/types";
import {
  MW, MH, QG, PG, CW,
  QF_TOP, SF_TOP, FI_TOP, TOTAL_H,
  QF_CY, SF_CY, FI_CY,
  SF_X, FI_X, CH_X,
  svgPaths, ROUND_AR,
} from "@/lib/cup";

function ClanRow({
  clan, score, won, tbd,
}: { clan?: Clan; score: number | null; won: boolean; tbd?: boolean }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2"
      style={{
        height: MH / 2,
        background: won ? "var(--accent-soft)" : undefined,
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      {clan?.logo_url
        ? <img src={clan.logo_url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="" />
        : <span className="w-5 h-5 rounded-full shrink-0 grid place-items-center text-[7px] font-bold"
            style={{ background: "var(--panel-hi)", color: "var(--muted)" }}>
            {tbd ? "?" : (clan?.tag?.slice(0,3) ?? "?")}
          </span>
      }
      <span className="flex-1 min-w-0 text-[11px] font-semibold truncate"
        style={{ color: tbd ? "var(--muted)" : won ? "var(--accent-hi)" : "var(--parchment)" }}>
        {tbd ? "TBD" : (clan?.name ?? "TBD")}
      </span>
      {score !== null && (
        <span className="font-data text-xs font-bold shrink-0"
          style={{ color: won ? "var(--accent-hi)" : "var(--muted)" }}>{score}</span>
      )}
    </div>
  );
}

function MatchCard({
  m, clans, editable, onSave,
}: {
  m: CupMatch | null;
  clans: Clan[];
  editable: boolean;
  onSave?: (id: string, hs: number, as_: number, winnerId: string) => void;
}) {
  const [hs, setHs] = useState("");
  const [as_, setAs] = useState("");
  const [winner, setWinner] = useState("");

  if (!m) {
    return (
      <div style={{ width: MW, height: MH, border: "1px solid var(--hairline)", borderRadius: 10,
        background: "var(--panel)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>TBD</span>
      </div>
    );
  }

  const home = clans.find(c => c.id === m.home_clan_id);
  const away = clans.find(c => c.id === m.away_clan_id);
  const homeWon = m.winner_id === m.home_clan_id;
  const awayWon = m.winner_id === m.away_clan_id;
  const tbd = !m.home_clan_id;

  if (editable && !m.played && m.home_clan_id && m.away_clan_id) {
    return (
      <div style={{ width: MW, border: "1px solid var(--accent-line)", borderRadius: 10,
        background: "var(--panel)", overflow: "hidden" }}>
        <div className="flex items-center gap-1 px-2 py-1" style={{ borderBottom: "1px solid var(--hairline)" }}>
          {home?.logo_url && <img src={home.logo_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />}
          <span className="flex-1 text-[10px] font-semibold truncate">{home?.name ?? "TBD"}</span>
          <input type="number" min="0" value={hs} onChange={e => setHs(e.target.value)}
            className="w-8 text-center font-data text-xs rounded bg-obsidian focus:outline-none py-0.5"
            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
        </div>
        <div className="flex items-center gap-1 px-2 py-1" style={{ borderBottom: "1px solid var(--hairline)" }}>
          {away?.logo_url && <img src={away.logo_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />}
          <span className="flex-1 text-[10px] font-semibold truncate">{away?.name ?? "TBD"}</span>
          <input type="number" min="0" value={as_} onChange={e => setAs(e.target.value)}
            className="w-8 text-center font-data text-xs rounded bg-obsidian focus:outline-none py-0.5"
            style={{ border: "1px solid var(--hairline)", color: "var(--parchment)" }} />
        </div>
        <div className="flex gap-1 px-2 py-1.5">
          <select value={winner} onChange={e => setWinner(e.target.value)}
            className="flex-1 text-[10px] rounded py-0.5 bg-obsidian focus:outline-none"
            style={{ border: "1px solid var(--hairline)", color: winner ? "var(--parchment)" : "var(--muted)" }}>
            <option value="">الفايز</option>
            <option value={m.home_clan_id}>{home?.name}</option>
            <option value={m.away_clan_id}>{away?.name}</option>
          </select>
          <button onClick={() => {
            if (!winner || hs === "" || as_ === "") return;
            onSave?.(m.id, Number(hs), Number(as_), winner);
            setHs(""); setAs(""); setWinner("");
          }}
            className="p-1 rounded shrink-0"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent-hi)" }}>
            <Save size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: MW, height: MH, border: `1px solid ${m.played ? "var(--accent-line)" : "var(--hairline)"}`,
      borderRadius: 10, background: "var(--panel)", overflow: "hidden" }}>
      <ClanRow clan={home} score={m.home_score} won={homeWon} tbd={tbd} />
      <div style={{ height: MH / 2 - 1 }}>
        <ClanRow clan={away} score={m.away_score} won={awayWon} tbd={tbd} />
      </div>
    </div>
  );
}

export default function CupBracket({
  slots, clans, editable = false, onSaveResult,
}: {
  slots: CupMatch[];
  clans: Clan[];
  editable?: boolean;
  onSaveResult?: (matchId: string, homeScore: number, awayScore: number, winnerId: string) => void;
}) {
  const bySlot = (s: number) => slots.find(m => m.slot === s) ?? null;
  const champion = slots.find(m => m.slot === 7 && m.winner_id)
    ? clans.find(c => c.id === slots.find(m => m.slot === 7)!.winner_id)
    : null;

  const totalW = CH_X + 100;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative" style={{ width: totalW, height: TOTAL_H }}>
        {/* SVG connector lines */}
        <svg width={totalW} height={TOTAL_H}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}>
          <path d={svgPaths("accent")}
            style={{ stroke: "var(--accent-line)", fill: "none", strokeWidth: 2, strokeLinecap: "round" }} />
        </svg>

        {/* QF matches */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{ position: "absolute", left: 0, top: QF_TOP[i] }}>
            <MatchCard m={bySlot(i+1)} clans={clans} editable={editable} onSave={onSaveResult} />
          </div>
        ))}

        {/* SF matches */}
        {[0,1].map(i => (
          <div key={i} style={{ position: "absolute", left: SF_X, top: SF_TOP[i] }}>
            <MatchCard m={bySlot(i+5)} clans={clans} editable={editable} onSave={onSaveResult} />
          </div>
        ))}

        {/* Final */}
        <div style={{ position: "absolute", left: FI_X, top: FI_TOP }}>
          <MatchCard m={bySlot(7)} clans={clans} editable={editable} onSave={onSaveResult} />
        </div>

        {/* Champion */}
        <div style={{ position: "absolute", left: CH_X + 4, top: FI_CY - 28, width: 88 }}>
          <div className="flex flex-col items-center gap-1 text-center">
            <Trophy size={18} style={{ color: "var(--accent)" }} />
            {champion
              ? <>
                  {champion.logo_url &&
                    <img src={champion.logo_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
                  <span className="text-[10px] font-bold leading-tight" style={{ color: "var(--accent-hi)" }}>
                    {champion.name}
                  </span>
                </>
              : <span className="text-[9px]" style={{ color: "var(--muted)" }}>البطل</span>
            }
          </div>
        </div>

        {/* Round labels */}
        {[
          { x: 0,     label: "دور الـ8" },
          { x: SF_X,  label: "نصف النهائي" },
          { x: FI_X,  label: "النهائي" },
        ].map(({ x, label }) => (
          <div key={label} style={{ position: "absolute", left: x, top: -24, width: MW, textAlign: "center" }}>
            <span className="font-ar font-bold text-[10px]" style={{ color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
