'use client';

import { useState } from 'react';
import Masonry from 'react-masonry-css';
import type { PhotoItem } from '@/lib/photos';
import { Lightbox } from './Lightbox';
import { PhotoTile } from './PhotoTile';

// Column count by viewport width. Keys are max-widths; `default` applies above
// the largest key: 5 columns on large displays down to 2 on phones.
const BREAKPOINT_COLUMNS = {
  default: 5,
  1280: 4,
  1024: 3,
  640: 2,
};

interface GalleryProps {
  photos: PhotoItem[];
}

export function Gallery({ photos }: GalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
      <Masonry
        breakpointCols={BREAKPOINT_COLUMNS}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {photos.map((photo, i) => (
          <PhotoTile key={photo.filename} photo={photo} onSelect={() => setSelected(i)} />
        ))}
      </Masonry>

      {selected !== null && (
        <Lightbox
          photos={photos}
          index={selected}
          onIndexChange={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
