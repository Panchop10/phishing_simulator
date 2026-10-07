import { prisma } from '@/lib/prisma';
import { isShuttingDown } from '@/lib/lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (isShuttingDown()) {
    return Response.json({ status: 'shutting_down' }, { status: 503 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ready' });
  } catch {
    return Response.json({ status: 'db_unavailable' }, { status: 503 });
  }
}
