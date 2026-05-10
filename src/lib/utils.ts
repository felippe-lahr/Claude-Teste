import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '—';
  }
}

export function parseDateBR(value: string): Date | null {
  if (!value) return null;
  // dd/mm/yyyy
  const parts = value.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    return isNaN(date.getTime()) ? null : date;
  }
  // fallback: ISO or other formats
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
