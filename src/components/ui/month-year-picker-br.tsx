'use client';

import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('pt-BR', ptBR);

interface Props {
  value?: string | null;   // ISO yyyy-MM-dd or empty
  onChange: (iso: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value + (value.includes('T') ? '' : 'T00:00:00'));
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function MonthYearPickerBR({ value, onChange, placeholder = 'mm/aaaa', className, disabled }: Props) {
  return (
    <ReactDatePicker
      locale="pt-BR"
      dateFormat="MM/yyyy"
      showMonthYearPicker
      selected={toDate(value)}
      onChange={(d: Date | null) => onChange(toISO(d))}
      placeholderText={placeholder}
      disabled={disabled}
      className={className}
      autoComplete="off"
    />
  );
}
