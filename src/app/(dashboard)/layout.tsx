import { redirect } from 'next/navigation';
import { getSession, hasAdmin } from '@/lib/auth';
import { SidebarNav } from '@/components/shared/sidebar-nav';
import { LogoutButton } from '@/components/shared/logout-button';
import { ShieldAlert } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasAdmin())) redirect('/setup');
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card hidden md:flex md:flex-col">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm leading-tight">Simulador de Phishing</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <SidebarNav />
        </nav>
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">Sesión: {session.username}</div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border bg-card p-4 font-semibold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Simulador de Phishing
        </header>
        <main className="flex-1 p-6 w-full max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
