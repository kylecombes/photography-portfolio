import { prisma } from './prisma';
import { lookupCity } from './geo';

// Client-generated UUIDs; accept a permissive but bounded id shape.
const SESSION_ID = /^[A-Za-z0-9-]{8,64}$/;

export const isValidSessionId = (value: unknown): value is string =>
  typeof value === 'string' && SESSION_ID.test(value);

/// Ensure a Session row exists. On first sight, resolve a coarse location from
/// the IP (the IP itself is never stored). Safe to call concurrently.
export async function ensureSession(sessionId: string, ip: string | null): Promise<void> {
  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (existing) return;

  const location = await lookupCity(ip);
  await prisma.session
    .create({
      data: {
        id: sessionId,
        city: location?.city ?? null,
        region: location?.region ?? null,
        country: location?.country ?? null,
      },
    })
    // A concurrent request may have created it first; that's fine.
    .catch(() => undefined);
}
