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
      className={`px-4 py-2 rounded-full text-sm font-semibold tracking-wide transition-all border ${
        active
          ? "bg-emerald-400/10 border-emerald-400/60 text-emerald-300 shadow-[0_0_16px_rgba(52,255,178,0.15)]"
          : "border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/25"
      }`}
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
  return <div className={`rounded-xl border border-white/10 bg-[#101720] ${className}`}>{children}</div>;
}
