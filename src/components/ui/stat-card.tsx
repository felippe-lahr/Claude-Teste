interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  gradient: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, gradient, icon }: StatCardProps) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-white/70">{sub}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-white/20 p-2 text-white">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
