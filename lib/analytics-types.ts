// Shared constants and event shapes for the analytics collector (client) and
// the ingest endpoints (server). No runtime browser/node dependencies here.

export const HEARTBEAT_MS = 5000; // session heartbeat interval / increment
export const MIN_VIEW_MS = 1000; // ignore photo views shorter than this
export const EVENT_DEBOUNCE_MS = 500; // min spacing between queued analytics events

export interface ViewEvent {
  type: 'view';
  filename: string;
  durationMs: number;
}

export interface ZoomEvent {
  type: 'zoom';
  filename: string;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  scale: number;
}

export type AnalyticsEvent = ViewEvent | ZoomEvent;

export interface AnalyticsPayload {
  sessionId: string;
  events: AnalyticsEvent[];
}
