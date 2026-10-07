'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatDateTime } from '@/lib/datetime';

export function TimelineChart({ data }: { data: { bucket: string; opens: number; clicks: number }[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Aún no hay actividad registrada.</p>;
  }
  const fmt = (b: string) => formatDateTime(b);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="bucket" tickFormatter={fmt} fontSize={11} stroke="hsl(var(--muted-foreground))" />
        <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
        <Tooltip labelFormatter={(l) => fmt(String(l))} />
        <Legend />
        <Area type="monotone" dataKey="opens" name="Aperturas" stroke="#f59e0b" fill="#fde68a" fillOpacity={0.5} />
        <Area type="monotone" dataKey="clicks" name="Clics" stroke="#dc2626" fill="#fecaca" fillOpacity={0.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
