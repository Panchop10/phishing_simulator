'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { putJson, postJson } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export type SettingsData = {
  appBaseUrl: string | null;
  orgName: string | null;
  securityContactEmail: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  mailFromName: string | null;
  mailFromEmail: string | null;
  mailReplyTo: string | null;
  allowedRecipientDomains: string | null;
  sendRatePerMinute: number;
  sendBatchSize: number;
  maxRecipientsPerCampaign: number;
  smtpPasswordSet: boolean;
};

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const [s, setS] = useState<SettingsData>(initial);
  const [password, setPassword] = useState('');
  const [testTo, setTestTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  function set<K extends keyof SettingsData>(k: K, v: SettingsData[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        appBaseUrl: s.appBaseUrl ?? '',
        orgName: s.orgName ?? '',
        securityContactEmail: s.securityContactEmail ?? '',
        smtpHost: s.smtpHost ?? '',
        smtpPort: s.smtpPort,
        smtpSecure: s.smtpSecure,
        smtpUser: s.smtpUser ?? '',
        mailFromName: s.mailFromName ?? '',
        mailFromEmail: s.mailFromEmail ?? '',
        mailReplyTo: s.mailReplyTo ?? '',
        allowedRecipientDomains: s.allowedRecipientDomains ?? '',
        sendRatePerMinute: s.sendRatePerMinute,
        sendBatchSize: s.sendBatchSize,
        maxRecipientsPerCampaign: s.maxRecipientsPerCampaign,
      };
      if (password) payload.smtpPassword = password;
      const updated = await putJson<SettingsData>('/api/settings', payload);
      setS(updated);
      setPassword('');
      toast.success('Configuración guardada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) return toast.error('Indica un correo de destino.');
    setTesting(true);
    try {
      await postJson('/api/settings/test-smtp', { to: testTo });
      toast.success(`Correo de prueba enviado a ${testTo}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falló el envío de prueba');
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Datos de la organización y URL pública para los enlaces de rastreo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="orgName">Nombre de la organización</Label>
            <Input id="orgName" value={s.orgName ?? ''} onChange={(e) => set('orgName', e.target.value)} placeholder="Empresa S.A." />
          </div>
          <div>
            <Label htmlFor="appBaseUrl">URL pública de la plataforma</Label>
            <Input id="appBaseUrl" value={s.appBaseUrl ?? ''} onChange={(e) => set('appBaseUrl', e.target.value)} placeholder="https://sim.empresa.cl" />
          </div>
          <div>
            <Label htmlFor="securityContactEmail">Correo del equipo de seguridad</Label>
            <Input id="securityContactEmail" value={s.securityContactEmail ?? ''} onChange={(e) => set('securityContactEmail', e.target.value)} placeholder="seguridad@empresa.cl" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servidor SMTP</CardTitle>
          <CardDescription>Credenciales de envío. La contraseña se guarda cifrada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="smtpHost">Host</Label>
              <Input id="smtpHost" value={s.smtpHost ?? ''} onChange={(e) => set('smtpHost', e.target.value)} placeholder="smtp.empresa.cl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpPort">Puerto</Label>
                <Input id="smtpPort" type="number" value={s.smtpPort} onChange={(e) => set('smtpPort', Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="smtpSecure">Seguridad</Label>
                <Select id="smtpSecure" value={s.smtpSecure ? 'true' : 'false'} onChange={(e) => set('smtpSecure', e.target.value === 'true')}>
                  <option value="false">STARTTLS (587)</option>
                  <option value="true">TLS directo (465)</option>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="smtpUser">Usuario</Label>
              <Input id="smtpUser" value={s.smtpUser ?? ''} onChange={(e) => set('smtpUser', e.target.value)} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="smtpPassword">Contraseña</Label>
              <Input id="smtpPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={s.smtpPasswordSet ? '•••••••• (guardada)' : 'Sin configurar'} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="mailFromName">Nombre "De"</Label>
              <Input id="mailFromName" value={s.mailFromName ?? ''} onChange={(e) => set('mailFromName', e.target.value)} placeholder="Soporte TI" />
            </div>
            <div>
              <Label htmlFor="mailFromEmail">Correo "De"</Label>
              <Input id="mailFromEmail" value={s.mailFromEmail ?? ''} onChange={(e) => set('mailFromEmail', e.target.value)} placeholder="no-reply@empresa.cl" />
            </div>
            <div>
              <Label htmlFor="mailReplyTo">Reply-To (opcional)</Label>
              <Input id="mailReplyTo" value={s.mailReplyTo ?? ''} onChange={(e) => set('mailReplyTo', e.target.value)} />
            </div>
          </div>
          <div className="rounded-md border border-border p-3 bg-muted/40">
            <Label htmlFor="testTo">Enviar correo de prueba (guarda primero)</Label>
            <div className="flex gap-2">
              <Input id="testTo" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="tu-correo@empresa.cl" />
              <Button type="button" variant="outline" onClick={sendTest} disabled={testing}>
                {testing ? 'Enviando…' : 'Probar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envío y seguridad</CardTitle>
          <CardDescription>Límites de velocidad y dominios de destino permitidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="rate">Correos por minuto</Label>
              <Input id="rate" type="number" value={s.sendRatePerMinute} onChange={(e) => set('sendRatePerMinute', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="batch">Tamaño de lote</Label>
              <Input id="batch" type="number" value={s.sendBatchSize} onChange={(e) => set('sendBatchSize', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="max">Máx. destinatarios por campaña</Label>
              <Input id="max" type="number" value={s.maxRecipientsPerCampaign} onChange={(e) => set('maxRecipientsPerCampaign', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label htmlFor="domains">Dominios permitidos (separados por coma)</Label>
            <Input id="domains" value={s.allowedRecipientDomains ?? ''} onChange={(e) => set('allowedRecipientDomains', e.target.value)} placeholder="empresa.cl, empresa.com" />
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas vacío se permite cualquier destino (útil para pruebas). En producción, restringe a los dominios de tu organización.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar configuración'}</Button>
      </div>
    </form>
  );
}
