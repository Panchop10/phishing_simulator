import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'danger' | 'muted' | 'primary';
}) {
  const toneClass = {
    default: 'text-foreground',
    primary: 'text-primary',
    warn: 'text-warning-foreground',
    danger: 'text-destructive',
    muted: 'text-muted-foreground',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-semibold mt-1', toneClass)}>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}
