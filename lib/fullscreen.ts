// Fullscreen helpers shared by the toggle button and the lightbox. Includes a
// WebKit (Safari) fallback for the prefixed API.

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function fullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export const isFullscreen = (): boolean => Boolean(fullscreenElement());

// When the fullscreen button or the `f` key toggles fullscreen, we stamp the
// time. That lets the lightbox tell an intentional exit apart from the browser's
// own Escape-to-exit (which is what should close the lightbox).
let lastToggleAt = 0;

export const wasRecentlyToggled = (withinMs = 700): boolean => Date.now() - lastToggleAt < withinMs;

export function toggleFullscreen(): void {
  lastToggleAt = Date.now();
  const doc = document as FullscreenDocument;
  if (fullscreenElement()) {
    void (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
    return;
  }
  const el = document.documentElement as FullscreenElement;
  void (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
}
