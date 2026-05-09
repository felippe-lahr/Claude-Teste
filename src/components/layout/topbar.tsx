'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User, TrendingUp } from 'lucide-react';

interface TickerItem {
  label: string;
  valor: string;
  unidade: string;
}

export function Topbar() {
  const { data: session } = useSession();
  const [ticker, setTicker] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch('/api/configuracoes/ticker')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          const items: TickerItem[] = [
            { label: 'Boi Gordo', valor: data.boi_gordo ?? '—', unidade: 'R$/@' },
            { label: 'Vaca Gorda', valor: data.vaca_gorda ?? '—', unidade: 'R$/@' },
            { label: 'Bezerro 8M', valor: data.bezerro_8m ?? '—', unidade: 'R$' },
            { label: 'Garrote 18M', valor: data.garrote_18m ?? '—', unidade: 'R$' },
          ];
          setTicker(items);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="sticky top-0 z-40">
      {/* Main topbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
              F
            </div>
            <div>
              <span className="text-white font-semibold text-sm leading-none">
                Fazenda Santo Antônio da Barra
              </span>
              <p className="text-slate-400 text-xs">Sistema de Gestão de Bovinos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <User size={16} className="text-slate-400" />
              <span>{session?.user?.name}</span>
              {session?.user?.role === 'ADMIN' && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-brand-500/30 text-brand-300 font-medium">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-sm transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Ticker bar */}
      {ticker.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
              <TrendingUp size={12} />
              <span className="text-xs font-medium">IMEA-MT</span>
            </div>
            {ticker.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-400 text-xs">{item.label}:</span>
                <span className="text-emerald-400 text-xs font-semibold">
                  {item.valor !== '—' ? `${item.unidade === 'R$/@' ? 'R$ ' : 'R$ '}${item.valor}` : '—'}
                </span>
                {item.unidade === 'R$/@' && (
                  <span className="text-slate-600 text-xs">/@</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
