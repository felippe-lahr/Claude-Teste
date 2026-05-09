import { cn } from '@/lib/utils';

const denominacaoColors: Record<string, string> = {
  'Vaca': 'bg-blue-100 text-blue-800',
  'Boi': 'bg-emerald-100 text-emerald-800',
  'Touro': 'bg-green-100 text-green-900',
  'Novilha': 'bg-violet-100 text-violet-800',
  'Garrote': 'bg-amber-100 text-amber-800',
  'Bezerra Fêmea': 'bg-pink-100 text-pink-800',
  'Bezerro Macho': 'bg-orange-100 text-orange-800',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'denominacao' | 'status' | 'default';
  value?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'bg-slate-100 text-slate-700';

  if (variant === 'denominacao' && value) {
    colorClass = denominacaoColors[value] ?? 'bg-slate-100 text-slate-700';
  } else if (variant === 'status') {
    if (value === 'VIVO') colorClass = 'bg-emerald-100 text-emerald-800';
    else if (value === 'MORTO') colorClass = 'bg-red-100 text-red-800';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
