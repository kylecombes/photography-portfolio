import {
  MIN_VIEW_MS,
  type AnalyticsEvent,
  type AnalyticsPayload,
  type ZoomEvent,
} from './analytics-types';

// Anonymous, per-visit session id. Held in sessionStorage so it resets each
// visit and is never a durable cross-visit tracker.
const SESSION_KEY = 'pp_session';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Events accumulate here and are flushed as a batch via sendBeacon.
let queue: AnalyticsEvent[] = [];

export function recordView(filename: string, durationMs: number): void {
  if (durationMs < MIN_VIEW_MS) return; // sub-second views aren't interesting
  queue.push({ type: 'view', filename, durationMs: Math.round(durationMs) });
}

export function recordZoom(filename: string, region: Omit<ZoomEvent, 'type' | 'filename'>): void {
  queue.push({ type: 'zoom', filename, ...region });
}

function beacon(url: string, body: object): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }));
}

export function flushEvents(): void {
  if (queue.length === 0) return;
  const payload: AnalyticsPayload = { sessionId: getSessionId(), events: queue };
  queue = [];
  beacon('/api/analytics', payload);
}

export function sendHeartbeat(): void {
  beacon('/api/session/heartbeat', { sessionId: getSessionId() });
}
