import { cn } from '@/lib/utils';

export function Funnel({
  sent,
  opened,
  clicked,
  total,
}: {
  sent: number;
  opened: number;
  clicked: number;
  total: number;
}) {
  const rows = [
    { label: 'Enviados', value: sent, base: total || 1, color: 'bg-primary' },
    { label: 'Abrieron el correo', value: opened, base: sent || 1, color: 'bg-warning' },
    { label: 'Hicieron clic', value: clicked, base: sent || 1, color: 'bg-destructive' },
  ];
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const pct = r.base > 0 ? Math.round((r.value / r.base) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{r.label}</span>
              <span className="text-muted-foreground">{r.value} ({pct}%)</span>
            </div>
            <div className="h-3 rounded bg-muted overflow-hidden">
              <div className={cn('h-3 rounded', r.color)} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
