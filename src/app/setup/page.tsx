import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { hasAdmin } from '@/lib/auth';
import { SetupForm } from '@/components/shared/setup-form';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  if (await hasAdmin()) redirect('/login');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold">Simulador de Phishing</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">Configuración inicial</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Crea la cuenta de administrador para comenzar. Es la única cuenta del sistema.
          </p>
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
