'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SetupForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [orgName, setOrgName] = useState('');
  const [appBaseUrl, setAppBaseUrl] = useState(
    typeof window !== 'undefined' ? window.location.origin : '',
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    try {
      await postJson('/api/auth/setup', { username, password, orgName, appBaseUrl });
      router.push('/campaigns');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la configuración inicial');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Usuario administrador</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        </div>
        <div>
          <Label htmlFor="confirm">Repetir contraseña</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </div>
      </div>
      <div>
        <Label htmlFor="orgName">Nombre de la organización (opcional)</Label>
        <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Empresa S.A." />
      </div>
      <div>
        <Label htmlFor="appBaseUrl">URL pública de la plataforma</Label>
        <Input id="appBaseUrl" value={appBaseUrl} onChange={(e) => setAppBaseUrl(e.target.value)} placeholder="https://sim.empresa.cl" />
        <p className="text-xs text-muted-foreground mt-1">Se usa para construir los enlaces de rastreo. Puedes cambiarla luego en Configuración.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creando…' : 'Crear cuenta y continuar'}
      </Button>
    </form>
  );
}
