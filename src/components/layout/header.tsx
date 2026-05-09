'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/animais': 'Animais',
  '/importar': 'Importar',
  '/mortes': 'Mortes',
  '/sanitario': 'Sanitário',
  '/configuracoes': 'Configurações',
};

interface TickerItem {
  label: string;
  valor: string;
  unidade: string;
}

export function Header() {
  const pathname = usePathname();
  const [ticker, setTicker] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch('/api/configuracoes/ticker')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          const items: TickerItem[] = [
            { label: 'Boi Gordo', valor: data.boi_gordo ?? '—', unidade: '@' },
            { label: 'Vaca Gorda', valor: data.vaca_gorda ?? '—', unidade: '@' },
            { label: 'Bezerro 8M', valor: data.bezerro_8m ?? '—', unidade: '' },
            { label: 'Garrote 18M', valor: data.garrote_18m ?? '—', unidade: '' },
          ].filter((i) => i.valor !== '—');
          setTicker(items);
        }
      })
      .catch(() => {});
  }, []);

  // Determine page label from pathname
  let pageLabel = 'Painel';
  for (const [key, label] of Object.entries(breadcrumbMap)) {
    if (pathname === key || pathname.startsWith(key + '/')) {
      pageLabel = label;
      break;
    }
  }

  return (
    <header className="h-[60px] shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Fazenda SAB</span>
        <span className="text-slate-300 text-xs">/</span>
        <span className="text-sm font-medium text-slate-800">{pageLabel}</span>
      </div>

      {/* Right: ticker + status */}
      <div className="flex items-center gap-4">
        {ticker.length > 0 && (
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 text-slate-400">
              <TrendingUp size={12} />
              <span className="text-[11px] font-medium uppercase tracking-wide">IMEA</span>
            </div>
            {ticker.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">{item.label}</span>
                <span className="text-[11px] font-semibold text-emerald-600">
                  R$ {item.valor}{item.unidade ? `/${item.unidade}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-[11px] font-medium text-slate-500">Online</span>
        </div>
      </div>
    </header>
  );
}
