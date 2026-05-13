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
  HeartPulse,
  ClipboardList,
  Package,
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
  { href: '/reproducao', label: 'Reprodução', icon: HeartPulse },
  { href: '/lotes', label: 'Lotes', icon: Package },
  { href: '/log', label: 'Log', icon: ClipboardList },
];

const ACCENT_COLORS = [
  { bg: '#EEF3FB', text: '#1B58A3' },
  { bg: '#F0EDFB', text: '#4D37B0' },
  { bg: '#FCF0F7', text: '#8B3B68' },
  { bg: '#EDF9F7', text: '#1A6B5E' },
  { bg: '#FBF3EC', text: '#8A4E1C' },
  { bg: '#EDF7F1', text: '#2F6A47' },
];

function ownerColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

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
  const initColors = ownerColor(userName);

  return (
    <aside className="w-60 h-screen flex flex-col bg-white border-r border-[#E8E8E3] shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E8E8E3]">
        <div className="w-8 h-8 rounded-lg bg-[#2F6A47] flex items-center justify-center text-white text-base shrink-0">
          🐄
        </div>
        <div className="overflow-hidden">
          <p className="text-[#111110] text-sm font-semibold leading-tight truncate">Fazenda SAB</p>
          <p className="text-[#A8A8A2] text-xs leading-tight truncate">Gestão de Bovinos</p>
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
                  ? 'bg-[#EDF7F1] text-[#2F6A47] font-semibold border-l-2 border-[#2F6A47] pl-[10px]'
                  : 'text-[#6B6B65] hover:bg-[#F5F4EF] hover:text-[#111110] border-l-2 border-transparent pl-[10px]'
              )}
            >
              <Icon size={16} className={cn(active ? 'text-[#2F6A47]' : 'text-[#A8A8A2] group-hover:text-[#6B6B65]')} />
              <span className="flex-1">{item.label}</span>
              {isAnimais && totalAnimais !== null && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7F1] text-[#2F6A47] min-w-[24px]">
                  {totalAnimais.toLocaleString('pt-BR')}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-[#E8E8E3] mx-3" />

      {/* User footer */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#F5F4EF]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: initColors.bg, color: initColors.text }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#111110] text-xs font-medium truncate">{userName}</p>
            <p className="text-[#A8A8A2] text-[11px] truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sair"
            className="p-1.5 rounded-lg text-[#A8A8A2] hover:text-[#9B3A2A] hover:bg-[#FBF0EE] transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
