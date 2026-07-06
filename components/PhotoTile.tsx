import type { PhotoItem } from '@/lib/photos';

interface PhotoTileProps {
  photo: PhotoItem;
  onSelect?: () => void;
}

/// A single masonry cell showing a photo's thumbnail. The wrapper reserves space
/// via aspect-ratio so the grid doesn't reflow as images load. Right-click and
/// drag are disabled as light download deterrence (not true prevention).
export function PhotoTile({ photo, onSelect }: PhotoTileProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Open photo"
      className="block w-full cursor-zoom-in overflow-hidden bg-neutral-900"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- derivatives are pre-optimized and served from a runtime volume, not the build output */}
      <img
        src={`/api/image/thumb/${encodeURIComponent(photo.filename)}`}
        alt=""
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onLoad={(event) => event.currentTarget.classList.add('opacity-100')}
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        className="h-auto w-full select-none opacity-0 transition-opacity duration-500"
      />
    </button>
  );
}
