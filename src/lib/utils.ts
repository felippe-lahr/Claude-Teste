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

export function formatMonthYearBR(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${m}/${d.getUTCFullYear()}`;
  } catch {
    return '—';
  }
}

export function parseDateBR(value: string): Date | null {
  if (!value) return null;
  // dd/mm/yyyy or dd/mm/yy
  const parts = value.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length <= 2) y = '20' + y.padStart(2, '0'); // "26" → "2026"
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
    return isNaN(date.getTime()) ? null : date;
  }
  // fallback: ISO or other formats
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
