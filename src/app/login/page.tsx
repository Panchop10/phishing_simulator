import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getSession, hasAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/shared/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (!(await hasAdmin())) redirect('/setup');
  if (await getSession()) redirect('/campaigns');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold">Simulador de Phishing</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground mb-5">Accede al panel de administración.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
