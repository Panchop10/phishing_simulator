import { ShieldAlert, Mail, Link2, Lock, AlertTriangle } from 'lucide-react';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function ConcientizacionPage() {
  let orgName: string | null = null;
  let contact: string | null = null;
  try {
    const s = await getSettings();
    orgName = s.orgName;
    contact = s.securityContactEmail;
  } catch {
    // La página debe mostrarse aunque la configuración no esté disponible.
  }

  const tips = [
    { icon: Mail, text: 'Desconfía de correos que apelan a la urgencia o al miedo ("tu cuenta será bloqueada").' },
    { icon: Link2, text: 'Pasa el cursor sobre los enlaces y revisa la dirección real antes de hacer clic.' },
    { icon: Lock, text: 'Verifica el remitente y nunca ingreses tus credenciales desde un enlace de correo.' },
    { icon: AlertTriangle, text: 'Ante la duda, reporta el correo al equipo de seguridad en lugar de responder.' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-warning/15 p-6 flex items-start gap-4 border-b border-border">
            <ShieldAlert className="h-10 w-10 text-warning-foreground shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">Caíste en una simulación de phishing</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tranquilo: este fue un ejercicio interno y autorizado de concientización
                {orgName ? ` de ${orgName}` : ''}. No se capturó ninguna credencial ni dato tuyo.
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm mb-5">
              Si este hubiera sido un ataque real, al hacer clic podrías haber comprometido tu cuenta o
              la información de la organización. Aprovecha para reforzar estos hábitos:
            </p>
            <ul className="space-y-3">
              {tips.map((t, i) => {
                const Icon = t.icon;
                return (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{t.text}</span>
                  </li>
                );
              })}
            </ul>
            {contact ? (
              <p className="text-sm text-muted-foreground mt-6 border-t border-border pt-4">
                ¿Dudas o quieres reportar un correo sospechoso? Escribe a{' '}
                <a className="text-primary font-medium" href={`mailto:${contact}`}>{contact}</a>.
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Este ejercicio busca entrenar, no castigar. Gracias por ayudar a proteger a tu organización.
        </p>
      </div>
    </div>
  );
}
