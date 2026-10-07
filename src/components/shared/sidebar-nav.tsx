'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Megaphone, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/templates', label: 'Plantillas', icon: FileText },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + '/');
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent',
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </>
  );
}
