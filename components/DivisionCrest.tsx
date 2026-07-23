"use client";

import { DivisionTheme } from "@/lib/theme";

/**
 * The signature element: the division crest set inside the double seal ring
 * that echoes the emblem's own outer ring. Used once per league page.
 */
export default function DivisionCrest({
  theme,
  clanCount,
  matchCount,
}: {
  theme: DivisionTheme;
  clanCount: number;
  matchCount: number;
}) {
  return (
    <section key={theme.key} className="crest-enter flex flex-col items-center text-center pt-2 pb-6">
      <div className="seal-ring p-3 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme.crest}
          alt={theme.nameAr}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
        />
      </div>

      <h1 className="font-ar font-black text-2xl sm:text-3xl mt-4" style={{ color: "var(--accent-hi)" }}>
        {theme.nameAr}
      </h1>
      <p
        className="font-display text-[11px] sm:text-xs uppercase tracking-[0.34em] mt-1.5"
        style={{ color: "var(--muted)" }}
      >
        {theme.nameEn}
      </p>

      <div className="rule w-40 my-4" />

      <div className="flex items-center gap-6 font-data text-xs" style={{ color: "var(--muted)" }}>
        <span>
          <strong style={{ color: "var(--parchment)" }}>{clanCount}</strong> كلان
        </span>
        <span aria-hidden style={{ color: "var(--accent-line)" }}>
          ◆
        </span>
        <span>
          <strong style={{ color: "var(--parchment)" }}>{matchCount}</strong> مباراة
        </span>
      </div>
    </section>
  );
}
