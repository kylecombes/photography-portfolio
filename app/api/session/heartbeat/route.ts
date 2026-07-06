import { HEARTBEAT_MS } from '@/lib/analytics-types';
import { lookupCity } from '@/lib/geo';
import { prisma } from '@/lib/prisma';
import { clientIp } from '@/lib/request-ip';
import { isValidSessionId } from '@/lib/session-store';

export const dynamic = 'force-dynamic';

const noContent = () => new Response(null, { status: 204 });

/// Heartbeat: called every ~5s while the page is visible. Accumulates foreground
/// time (activeMs) in fixed HEARTBEAT_MS increments so a delayed or backgrounded
/// beat can't inflate the total, and pauses naturally when the tab is hidden.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId;
  if (!isValidSessionId(sessionId)) return new Response('Bad request', { status: 400 });

  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (existing) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { activeMs: { increment: HEARTBEAT_MS }, lastSeen: new Date() },
    });
    return noContent();
  }

  const location = await lookupCity(clientIp(request));
  await prisma.session
    .create({
      data: {
        id: sessionId,
        activeMs: HEARTBEAT_MS,
        city: location?.city ?? null,
        region: location?.region ?? null,
        country: location?.country ?? null,
      },
    })
    .catch(() => undefined);
  return noContent();
}
