import { prisma } from './prisma';

export interface PhotoItem {
  filename: string;
  width: number;
  height: number;
  takenAt: string | null; // ISO string (serializable across the RSC boundary)
}

/// All photos, newest first. Orders by capture time when known, falling back to
/// import time so undated photos still appear (at the end of the dated ones).
export async function getPhotos(): Promise<PhotoItem[]> {
  const photos = await prisma.photo.findMany({
    orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { importedAt: 'desc' }],
    select: { filename: true, width: true, height: true, takenAt: true },
  });

  return photos.map((photo) => ({
    filename: photo.filename,
    width: photo.width,
    height: photo.height,
    takenAt: photo.takenAt ? photo.takenAt.toISOString() : null,
  }));
}
