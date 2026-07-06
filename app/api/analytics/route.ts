import { MIN_VIEW_MS, type AnalyticsEvent } from '@/lib/analytics-types';
import { prisma } from '@/lib/prisma';
import { clientIp } from '@/lib/request-ip';
import { ensureSession, isValidSessionId } from '@/lib/session-store';

export const dynamic = 'force-dynamic';

const MAX_EVENTS = 500; // guard against oversized batches
const clampUnit = (value: unknown): number => Math.min(1, Math.max(0, Number(value) || 0));
const safeFilename = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 && value.length <= 255 ? value : null;

/// Batched analytics ingest (sent via sendBeacon). Bulk-inserts photo views
/// (>= 1s) and zoom regions for a session, creating the session if needed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId;
  const events: unknown = body?.events;
  if (!isValidSessionId(sessionId) || !Array.isArray(events)) {
    return new Response('Bad request', { status: 400 });
  }

  const list = (events as AnalyticsEvent[]).slice(0, MAX_EVENTS);

  const views = list.flatMap((event) => {
    if (event.type !== 'view') return [];
    const filename = safeFilename(event.filename);
    const durationMs = Math.round(Number(event.durationMs));
    if (!filename || !Number.isFinite(durationMs) || durationMs < MIN_VIEW_MS) return [];
    return [{ sessionId, filename, durationMs }];
  });

  const zooms = list.flatMap((event) => {
    if (event.type !== 'zoom') return [];
    const filename = safeFilename(event.filename);
    if (!filename) return [];
    return [
      {
        sessionId,
        filename,
        rx: clampUnit(event.rx),
        ry: clampUnit(event.ry),
        rw: clampUnit(event.rw),
        rh: clampUnit(event.rh),
        scale: Number(event.scale) || 1,
      },
    ];
  });

  if (views.length === 0 && zooms.length === 0) return new Response(null, { status: 204 });

  // Only keep events for photos that still exist — the Photo FK would otherwise
  // reject a beacon that arrives just after a photo was deleted.
  const filenames = [...new Set([...views, ...zooms].map((event) => event.filename))];
  const existing = new Set(
    (
      await prisma.photo.findMany({
        where: { filename: { in: filenames } },
        select: { filename: true },
      })
    ).map((photo) => photo.filename),
  );
  const validViews = views.filter((view) => existing.has(view.filename));
  const validZooms = zooms.filter((zoom) => existing.has(zoom.filename));

  if (validViews.length === 0 && validZooms.length === 0)
    return new Response(null, { status: 204 });

  await ensureSession(sessionId, clientIp(request));
  await Promise.all([
    validViews.length ? prisma.imageView.createMany({ data: validViews }) : null,
    validZooms.length ? prisma.zoomRegion.createMany({ data: validZooms }) : null,
  ]);

  return new Response(null, { status: 204 });
}
