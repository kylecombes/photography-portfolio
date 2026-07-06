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
const PAN_THRESHOLD = 4; // px of movement before a press counts as a drag (not a tap)
const SMOOTHING = 0.2; // per-frame easing toward the target (exponential)
const MAX_SCALE_STEP = 0.08; // cap on scale change per frame, so far targets ease in at a steady speed instead of lurching

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const IDENTITY: Transform = { scale: 1, tx: 0, ty: 0 };

export interface VisibleRegion {
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  scale: number;
}

export interface ZoomPan {
  scale: number;
  isZoomed: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
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
  getVisibleRegion: () => VisibleRegion | null;
}

/// Zoom + pan for the lightbox image. Zoom eases toward a target scale via a
/// requestAnimationFrame tween (velocity-continuous, so rapid clicks accumulate
/// and never lurch); panning is applied instantly. Panning is clamped to the
/// image edges, and cursor-anchored zoom keeps the point under the cursor fixed.
export function useZoomPan(): ZoomPan {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // `rendered` is what's on screen; `target` is where the zoom is heading. Both
  // are refs (mutated by the animation loop / pointer handlers); `render` state
  // mirrors `rendered` to trigger paints.
  const [render, setRender] = useState<Transform>(IDENTITY);
  const rendered = useRef<Transform>(IDENTITY);
  const target = useRef<Transform>(IDENTITY);
  const frame = useRef(0);
  const pan = useRef({ active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

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

  const step = useCallback(function step() {
    const cur = rendered.current;
    const tgt = target.current;
    let ds = (tgt.scale - cur.scale) * SMOOTHING;
    let dtx = (tgt.tx - cur.tx) * SMOOTHING;
    let dty = (tgt.ty - cur.ty) * SMOOTHING;
    // Cap the speed uniformly (scale + translate scaled together, so the zoom
    // trajectory stays consistent). Big target jumps ease in at a steady pace
    // instead of a fast ease-out lurch; the tail still decelerates smoothly.
    if (Math.abs(ds) > MAX_SCALE_STEP) {
      const ratio = MAX_SCALE_STEP / Math.abs(ds);
      ds *= ratio;
      dtx *= ratio;
      dty *= ratio;
    }
    const next: Transform = {
      scale: cur.scale + ds,
      tx: cur.tx + dtx,
      ty: cur.ty + dty,
    };
    const done =
      Math.abs(tgt.scale - next.scale) < 0.001 &&
      Math.abs(tgt.tx - next.tx) < 0.1 &&
      Math.abs(tgt.ty - next.ty) < 0.1;
    const value = done ? tgt : next;
    rendered.current = value;
    setRender(value);
    frame.current = done ? 0 : requestAnimationFrame(step);
  }, []);

  const animateTo = useCallback(
    (next: Transform) => {
      target.current = next;
      if (!frame.current) frame.current = requestAnimationFrame(step);
    },
    [step],
  );

  // Apply a transform instantly (used for panning), cancelling any zoom tween.
  const jumpTo = useCallback((next: Transform) => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    target.current = next;
    rendered.current = next;
    setRender(next);
  }, []);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  // Zoom target math, based on the current target so rapid clicks compound. When
  // a cursor position is given, keep that point visually fixed.
  const computeZoom = useCallback(
    (base: Transform, nextScale: number, clientX?: number, clientY?: number): Transform => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (scale === MIN_SCALE) return IDENTITY;
      const stage = stageRef.current;
      if (!stage || clientX === undefined || clientY === undefined) {
        return clampTranslate(scale, base.tx, base.ty);
      }
      const rect = stage.getBoundingClientRect();
      const relX = clientX - rect.left - rect.width / 2;
      const relY = clientY - rect.top - rect.height / 2;
      const pointX = (relX - base.tx) / base.scale;
      const pointY = (relY - base.ty) / base.scale;
      return clampTranslate(scale, relX - pointX * scale, relY - pointY * scale);
    },
    [clampTranslate],
  );

  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);
  const zoomIn = useCallback(
    () => animateTo(computeZoom(target.current, target.current.scale * BUTTON_STEP)),
    [animateTo, computeZoom],
  );
  const zoomOut = useCallback(
    () => animateTo(computeZoom(target.current, target.current.scale / BUTTON_STEP)),
    [animateTo, computeZoom],
  );

  const toggleZoomAt = useCallback(
    (clientX: number, clientY: number) => {
      if (target.current.scale > MIN_SCALE) reset();
      else animateTo(computeZoom(target.current, DOUBLE_TAP_SCALE, clientX, clientY));
    },
    [animateTo, computeZoom, reset],
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      const factor = event.deltaY < 0 ? BUTTON_STEP : 1 / BUTTON_STEP;
      animateTo(
        computeZoom(target.current, target.current.scale * factor, event.clientX, event.clientY),
      );
    },
    [animateTo, computeZoom],
  );

  const panPointerDown = useCallback((event: PointerEvent) => {
    if (rendered.current.scale <= MIN_SCALE) return;
    pan.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      baseX: rendered.current.tx,
      baseY: rendered.current.ty,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const panPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!pan.current.active) return;
      const dx = event.clientX - pan.current.startX;
      const dy = event.clientY - pan.current.startY;
      // Only treat this as a drag once the pointer actually moves — a plain click
      // (e.g. part of a double-click) must not start panning.
      if (!pan.current.moved) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        pan.current.moved = true;
      }
      jumpTo(
        clampTranslate(rendered.current.scale, pan.current.baseX + dx, pan.current.baseY + dy),
      );
    },
    [clampTranslate, jumpTo],
  );

  const panPointerUp = useCallback((event: PointerEvent) => {
    if (!pan.current.active) return;
    pan.current.active = false;
    pan.current.moved = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  // The fraction of the image currently visible in the stage (for zoom analytics).
  const getVisibleRegion = useCallback((): VisibleRegion | null => {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !stage) return null;
    const { scale, tx, ty } = rendered.current;
    const scaledW = image.offsetWidth * scale;
    const scaledH = image.offsetHeight * scale;
    const imgLeft = stage.clientWidth / 2 + tx - scaledW / 2;
    const imgTop = stage.clientHeight / 2 + ty - scaledH / 2;
    const visLeft = Math.max(0, imgLeft);
    const visTop = Math.max(0, imgTop);
    const visRight = Math.min(stage.clientWidth, imgLeft + scaledW);
    const visBottom = Math.min(stage.clientHeight, imgTop + scaledH);
    if (visRight <= visLeft || visBottom <= visTop) return null;
    return {
      rx: (visLeft - imgLeft) / scaledW,
      ry: (visTop - imgTop) / scaledH,
      rw: (visRight - visLeft) / scaledW,
      rh: (visBottom - visTop) / scaledH,
      scale,
    };
  }, []);

  return {
    scale: render.scale,
    isZoomed: render.scale > MIN_SCALE,
    canZoomIn: render.scale < MAX_SCALE,
    canZoomOut: render.scale > MIN_SCALE,
    transform: `translate(${render.tx}px, ${render.ty}px) scale(${render.scale})`,
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
    getVisibleRegion,
  };
}
