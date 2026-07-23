export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors border"
      style={
        active
          ? {
              color: "var(--accent-hi)",
              borderColor: "var(--accent-line)",
              background: "var(--accent-soft)",
            }
          : { color: "var(--muted)", borderColor: "var(--hairline)" }
      }
    >
      {children}
    </button>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-panel ${className}`}
      style={{ border: "1px solid var(--hairline)" }}
    >
      {children}
    </div>
  );
}

/** Small uppercase label used above sections. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: "var(--muted)" }}
    >
      {children}
    </span>
  );
}
