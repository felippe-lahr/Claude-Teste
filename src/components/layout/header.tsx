'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';

const breadcrumbMap: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/animais':       'Animais',
  '/importar':      'Importar',
  '/mortes':        'Mortes',
  '/sanitario':     'Sanitário',
  '/reproducao':    'Reprodução',
  '/lotes':         'Lotes',
  '/log':           'Log',
  '/configuracoes': 'Configurações',
};

interface TickerItem {
  label: string;
  valor: string;
  unidade: string;
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [ticker, setTicker]       = useState<TickerItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [stale, setStale]         = useState(false);

  useEffect(() => {
    fetch('/api/configuracoes/ticker')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          const items: TickerItem[] = [
            { label: 'Boi Gordo MT',   valor: data.boi_gordo   ?? '—', unidade: '@' },
            { label: 'Vaca Gorda MT',  valor: data.vaca_gorda  ?? '—', unidade: '@' },
            { label: 'Bezerro 8M MT',  valor: data.bezerro_8m  ?? '—', unidade: '' },
            { label: 'Garrote 18M MT', valor: data.garrote_18m ?? '—', unidade: '' },
          ].filter((i) => i.valor !== '—');
          setTicker(items);

          if (data._updatedAt) {
            const d = new Date(data._updatedAt);
            setUpdatedAt(d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }));
            // Alerta se passou mais de 1 dia útil sem atualização
            const diffH = (Date.now() - d.getTime()) / 36e5;
            setStale(diffH > 28);
          }
        }
      })
      .catch(() => {});
  }, []);

  let pageLabel = 'Painel';
  for (const [key, label] of Object.entries(breadcrumbMap)) {
    if (pathname === key || pathname.startsWith(key + '/')) {
      pageLabel = label;
      break;
    }
  }

  return (
    <header className="shrink-0 bg-white border-b border-[#E8E8E3]">
      {/* Main row */}
      <div className="h-[52px] flex items-center justify-between px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#A8A8A2]">Fazenda SAB</span>
          <span className="text-[#A8A8A2] text-xs">/</span>
          <span className="text-sm font-medium text-[#111110]">{pageLabel}</span>
        </div>

        {/* Right: status */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2F6A47] inline-block" />
          <span className="text-[11px] font-medium text-[#6B6B65]">Online</span>
        </div>
      </div>

      {/* Ticker strip */}
      {ticker.length > 0 && (
        <div className="h-[30px] border-t border-[#F0EFE9] bg-[#FAFAF7] flex items-center overflow-hidden relative">
          {/* Left label — fixed, not scrolled */}
          <div className="flex items-center gap-1.5 pl-4 pr-3 shrink-0 border-r border-[#E8E8E3] h-full bg-[#FAFAF7] z-10">
            <TrendingUp size={11} className="text-[#2F6A47]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2F6A47] whitespace-nowrap">
              IMEA · MT
            </span>
          </div>

          {/* Scrolling area */}
          <div className="flex-1 overflow-hidden relative">
            <div className="ticker-track flex items-center gap-0">
              {/* Render items twice for seamless loop */}
              {[...ticker, ...ticker].map((item, i) => (
                <div key={i} className="flex items-center gap-1 px-5 border-r border-[#EBEBEB] h-[30px] whitespace-nowrap shrink-0">
                  <span className="text-[10px] text-[#9B9B94] font-medium">{item.label}</span>
                  <span className="text-[10px] font-bold text-[#111110]">
                    R$&nbsp;{item.valor}
                    {item.unidade ? <span className="text-[#A8A8A2] font-normal">/{item.unidade}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: updated date + stale warning */}
          <div className="pl-3 pr-4 shrink-0 border-l border-[#E8E8E3] h-full flex items-center gap-2 bg-[#FAFAF7]">
            {updatedAt && (
              <span className="text-[9px] text-[#C0C0B8] whitespace-nowrap">atualizado {updatedAt}</span>
            )}
            {stale && isAdmin && (
              <Link
                href="/configuracoes"
                title="Cotações desatualizadas — clique para atualizar"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FBF6ED] border border-[#F0D8A0] hover:bg-[#F7EDCC] transition-colors"
              >
                <AlertTriangle size={9} className="text-[#8A6A10]" />
                <span className="text-[9px] font-semibold text-[#8A6A10] whitespace-nowrap">Atualizar</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
