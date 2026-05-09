'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Beef,
  Upload,
  Skull,
  Syringe,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/animais', label: 'Animais', icon: Beef },
  { href: '/importar', label: 'Importar', icon: Upload },
  { href: '/mortes', label: 'Mortes', icon: Skull },
  { href: '/sanitario', label: 'Sanitário', icon: Syringe },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const allItems = [
    ...navItems,
    ...(session?.user?.role === 'ADMIN'
      ? [{ href: '/configuracoes', label: 'Configurações', icon: Settings }]
      : []),
  ];

  return (
    <nav className="bg-brand-600 border-b border-brand-700">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                  active
                    ? 'text-white border-white bg-white/10'
                    : 'text-brand-100 hover:text-white border-transparent hover:bg-white/10'
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
