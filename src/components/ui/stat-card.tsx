import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, sub, color, icon: Icon }: StatCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-5 overflow-hidden group hover:shadow-md transition-shadow">
      {/* Icon badge */}
      <div
        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-90"
        style={{ backgroundColor: `${color}1a` }}
      >
        <Icon size={16} style={{ color }} />
      </div>

      {/* Content */}
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: `${color}cc` }}
      >
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 leading-none mb-1">
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}

      {/* Accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
