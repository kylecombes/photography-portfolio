import type { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  interactive: boolean;
  className?: string;
  children: ReactNode;
}

function IconButton({ label, onClick, interactive, className = '', children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`cursor-pointer rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 ${
        interactive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface LightboxControlsProps {
  visible: boolean;
  index: number;
  count: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/// The fading control layer over the lightbox image: close, prev/next, a photo
/// counter, and zoom buttons. The whole layer fades with `visible`; individual
/// buttons opt back into pointer events only while visible.
export function LightboxControls({
  visible,
  index,
  count,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onZoomIn,
  onZoomOut,
}: LightboxControlsProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <IconButton
        label="Close"
        onClick={onClose}
        interactive={visible}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center text-xl"
      >
        ✕
      </IconButton>

      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-xs tracking-wide text-white/60">
        {index + 1} / {count}
      </div>

      {hasPrev && (
        <IconButton
          label="Previous photo"
          onClick={onPrev}
          interactive={visible}
          className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-2xl"
        >
          ‹
        </IconButton>
      )}

      {hasNext && (
        <IconButton
          label="Next photo"
          onClick={onNext}
          interactive={visible}
          className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-2xl"
        >
          ›
        </IconButton>
      )}

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        <IconButton
          label="Zoom out"
          onClick={onZoomOut}
          interactive={visible}
          className="flex h-10 w-10 items-center justify-center text-xl"
        >
          −
        </IconButton>
        <IconButton
          label="Zoom in"
          onClick={onZoomIn}
          interactive={visible}
          className="flex h-10 w-10 items-center justify-center text-xl"
        >
          +
        </IconButton>
      </div>
    </div>
  );
}
