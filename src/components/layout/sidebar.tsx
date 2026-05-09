'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Beef,
  Upload,
  Skull,
  Syringe,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/animais', label: 'Animais', icon: Beef },
  { href: '/importar', label: 'Importar', icon: Upload },
  { href: '/mortes', label: 'Mortes', icon: Skull },
  { href: '/sanitario', label: 'Sanitário', icon: Syringe },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [totalAnimais, setTotalAnimais] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/animais?limit=1&status=VIVO')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.total === 'number') {
          setTotalAnimais(data.total);
        }
      })
      .catch(() => {});
  }, []);

  const allItems = [
    ...navItems,
    ...(session?.user?.role === 'ADMIN'
      ? [{ href: '/configuracoes', label: 'Configurações', icon: Settings }]
      : []),
  ];

  const userName = session?.user?.name ?? '';
  const userEmail = session?.user?.email ?? '';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="w-60 h-screen flex flex-col bg-[#0f172a] border-r border-slate-800 shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-base shrink-0">
          🐄
        </div>
        <div className="overflow-hidden">
          <p className="text-white text-sm font-semibold leading-tight truncate">Fazenda SAB</p>
          <p className="text-slate-500 text-xs leading-tight truncate">Gestão de Bovinos</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {allItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const isAnimais = item.href === '/animais';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group',
                active
                  ? 'bg-slate-800 text-white border-l-2 border-indigo-500 pl-[10px]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-2 border-transparent pl-[10px]'
              )}
            >
              <Icon size={16} className={cn(active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
              <span className="flex-1">{item.label}</span>
              {isAnimais && totalAnimais !== null && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300 min-w-[24px]">
                  {totalAnimais.toLocaleString('pt-BR')}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-slate-800 mx-3" />

      {/* User footer */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <p className="text-slate-500 text-[11px] truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sair"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
