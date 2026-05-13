import { cn } from '@/lib/utils';

const denominacaoColors: Record<string, string> = {
  'Vaca': 'bg-[#FCF0F7] text-[#8B3B68]',
  'Boi': 'bg-[#EEF3FB] text-[#1B58A3]',
  'Touro': 'bg-[#F0EDFB] text-[#4D37B0]',
  'Novilha': 'bg-[#EDF9F7] text-[#1A6B5E]',
  'Garrote': 'bg-[#FBF3EC] text-[#8A4E1C]',
  'Bezerra Fêmea': 'bg-[#FEF0F8] text-[#A0347A]',
  'Bezerro Macho': 'bg-[#EAF4FF] text-[#1565A8]',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'denominacao' | 'status' | 'genero' | 'default';
  value?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'bg-[#F0EFEB] text-[#6B6B65]';

  if (variant === 'denominacao' && value) {
    colorClass = denominacaoColors[value] ?? 'bg-[#F0EFEB] text-[#6B6B65]';
  } else if (variant === 'status') {
    if (value === 'VIVO') colorClass = 'bg-[#EDF7F1] text-[#2F6A47]';
    else if (value === 'MORTO') colorClass = 'bg-[#FBF0EE] text-[#9B3A2A]';
    else if (value === 'VENDIDO') colorClass = 'bg-[#FBF6ED] text-[#7A5E18]';
  } else if (variant === 'genero') {
    if (value === 'MACHO') colorClass = 'bg-[#EEF3FB] text-[#1B58A3]';
    else if (value === 'FEMEA') colorClass = 'bg-[#FCF0F7] text-[#8B3B68]';
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
