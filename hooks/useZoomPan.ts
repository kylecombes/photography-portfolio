'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
  type WheelEvent,
} from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BUTTON_STEP = 1.6;
const DOUBLE_TAP_SCALE = 2.5;

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const IDENTITY: Transform = { scale: 1, tx: 0, ty: 0 };

export interface ZoomPan {
  scale: number;
  isZoomed: boolean;
  transform: string;
  stageRef: RefObject<HTMLDivElement | null>;
  imageRef: RefObject<HTMLImageElement | null>;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleZoomAt: (clientX: number, clientY: number) => void;
  onWheel: (event: WheelEvent) => void;
  panPointerDown: (event: PointerEvent) => void;
  panPointerMove: (event: PointerEvent) => void;
  panPointerUp: (event: PointerEvent) => void;
}

/// Zoom + pan transform state for the lightbox image. Panning is clamped so the
/// image can't be dragged past its own edges, and wheel/double-tap zoom keep the
/// point under the cursor stable. The current (scale, tx, ty) is also what the
/// analytics layer reads to compute the visible region.
export function useZoomPan(): ZoomPan {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);

  // Mirror the committed transform so pointer handlers can read the pan origin.
  // Written from an effect (never during render).
  const latest = useRef(transform);
  useEffect(() => {
    latest.current = transform;
  }, [transform]);

  const pan = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  // Max translation per axis: how far the scaled image overflows the stage.
  const overflow = useCallback((scale: number) => {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2),
      y: Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2),
    };
  }, []);

  const clampTranslate = useCallback(
    (scale: number, tx: number, ty: number): Transform => {
      const bound = overflow(scale);
      return { scale, tx: clamp(tx, -bound.x, bound.x), ty: clamp(ty, -bound.y, bound.y) };
    },
    [overflow],
  );

  // Pure transform math for a zoom, given the previous transform. Keeping the
  // point at (clientX, clientY) visually fixed when a cursor position is given.
  const computeZoom = useCallback(
    (prev: Transform, nextScale: number, clientX?: number, clientY?: number): Transform => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (scale === MIN_SCALE) return IDENTITY;
      const stage = stageRef.current;
      if (!stage || clientX === undefined || clientY === undefined) {
        return clampTranslate(scale, prev.tx, prev.ty);
      }
      const rect = stage.getBoundingClientRect();
      const relX = clientX - rect.left - rect.width / 2;
      const relY = clientY - rect.top - rect.height / 2;
      const pointX = (relX - prev.tx) / prev.scale;
      const pointY = (relY - prev.ty) / prev.scale;
      return clampTranslate(scale, relX - pointX * scale, relY - pointY * scale);
    },
    [clampTranslate],
  );

  const reset = useCallback(() => setTransform(IDENTITY), []);
  const zoomIn = useCallback(
    () => setTransform((prev) => computeZoom(prev, prev.scale * BUTTON_STEP)),
    [computeZoom],
  );
  const zoomOut = useCallback(
    () => setTransform((prev) => computeZoom(prev, prev.scale / BUTTON_STEP)),
    [computeZoom],
  );

  const toggleZoomAt = useCallback(
    (clientX: number, clientY: number) =>
      setTransform((prev) =>
        prev.scale > MIN_SCALE ? IDENTITY : computeZoom(prev, DOUBLE_TAP_SCALE, clientX, clientY),
      ),
    [computeZoom],
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      const factor = event.deltaY < 0 ? BUTTON_STEP : 1 / BUTTON_STEP;
      const { clientX, clientY } = event;
      setTransform((prev) => computeZoom(prev, prev.scale * factor, clientX, clientY));
    },
    [computeZoom],
  );

  const panPointerDown = useCallback((event: PointerEvent) => {
    if (latest.current.scale <= MIN_SCALE) return;
    pan.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      baseX: latest.current.tx,
      baseY: latest.current.ty,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const panPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!pan.current.active) return;
      const dx = event.clientX - pan.current.startX;
      const dy = event.clientY - pan.current.startY;
      setTransform((prev) =>
        clampTranslate(prev.scale, pan.current.baseX + dx, pan.current.baseY + dy),
      );
    },
    [clampTranslate],
  );

  const panPointerUp = useCallback((event: PointerEvent) => {
    if (!pan.current.active) return;
    pan.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    scale: transform.scale,
    isZoomed: transform.scale > MIN_SCALE,
    transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
    stageRef,
    imageRef,
    reset,
    zoomIn,
    zoomOut,
    toggleZoomAt,
    onWheel,
    panPointerDown,
    panPointerMove,
    panPointerUp,
  };
}
