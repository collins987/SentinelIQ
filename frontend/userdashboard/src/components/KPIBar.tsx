interface KPIBarProps {
  stats: Array<{ label: string; value: string | number; icon: string; color: string }>;
}

export default function KPIBar({ stats }: KPIBarProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.slice(0, 4).map((card, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ background: `${card.color}14`, color: card.color }}
            >
              {card.icon}
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Live</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</span>
            <span className="text-2xl font-semibold tracking-tight text-slate-900">{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
