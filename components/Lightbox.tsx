'use client';

import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { useAutoHideControls } from '@/hooks/useAutoHideControls';
import { useZoomPan } from '@/hooks/useZoomPan';
import type { PhotoItem } from '@/lib/photos';
import { LightboxControls } from './LightboxControls';

const SWIPE_THRESHOLD = 60; // px of horizontal travel to count as a swipe
const TAP_SLOP = 10; // px of travel under which a pointer press is a tap, not a drag

interface LightboxProps {
  photos: PhotoItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onIndexChange, onClose }: LightboxProps) {
  const photo = photos[index];
  const {
    transform,
    isZoomed,
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
  } = useZoomPan();
  const { visible, poke } = useAutoHideControls();
  const gesture = useRef<{ x: number; y: number; mode: 'idle' | 'swipe' | 'pan' }>({
    x: 0,
    y: 0,
    mode: 'idle',
  });

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  // Navigation resets zoom so each photo opens fit-to-screen.
  const goPrev = useCallback(() => {
    reset();
    onIndexChange(Math.max(0, index - 1));
  }, [index, onIndexChange, reset]);
  const goNext = useCallback(() => {
    reset();
    onIndexChange(Math.min(photos.length - 1, index + 1));
  }, [index, photos.length, onIndexChange, reset]);

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Keyboard: arrows navigate, +/- zoom, Escape closes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      poke();
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
      else if (event.key === '+' || event.key === '=') zoomIn();
      else if (event.key === '-') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose, poke, zoomIn, zoomOut]);

  const onPointerDown = (event: PointerEvent) => {
    poke();
    if (isZoomed) {
      gesture.current.mode = 'pan';
      panPointerDown(event);
    } else {
      gesture.current = { x: event.clientX, y: event.clientY, mode: 'swipe' };
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (gesture.current.mode === 'pan') panPointerMove(event);
  };

  const isOutsideImage = (clientX: number, clientY: number): boolean => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom
    );
  };

  const onPointerUp = (event: PointerEvent) => {
    const g = gesture.current;
    gesture.current.mode = 'idle';

    if (g.mode === 'pan') {
      panPointerUp(event);
      return;
    }
    if (g.mode !== 'swipe') return;

    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev();
      else goNext();
      return;
    }
    // A tap: outside the image closes; on the image just wakes the controls.
    if (Math.hypot(dx, dy) < TAP_SLOP && isOutsideImage(event.clientX, event.clientY)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div
        ref={stageRef}
        className="absolute inset-0 flex touch-none items-center justify-center overflow-hidden"
        style={{ cursor: isZoomed ? 'grab' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={(event) => toggleZoomAt(event.clientX, event.clientY)}
        onMouseMove={poke}
        onContextMenu={(event) => event.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- full-size derivative served from a runtime volume */}
        <img
          ref={imageRef}
          src={`/api/image/full/${encodeURIComponent(photo.filename)}`}
          alt=""
          draggable={false}
          style={{ transform }}
          className="pointer-events-none max-h-full max-w-full select-none object-contain will-change-transform"
        />
      </div>

      <LightboxControls
        visible={visible}
        index={index}
        count={photos.length}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={goPrev}
        onNext={goNext}
        onClose={onClose}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />
    </div>
  );
}
