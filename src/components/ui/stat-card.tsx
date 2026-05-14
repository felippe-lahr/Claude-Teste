interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div
      className="relative rounded-xl border shadow-sm p-5 overflow-hidden hover:shadow-md transition-shadow"
      style={{
        backgroundColor: `${color}18`,
        borderColor: `${color}40`,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: `${color}CC` }}>
        {label}
      </p>
      <p className="text-3xl font-bold leading-none mb-1" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: `${color}99` }}>{sub}</p>}
    </div>
  );
}
