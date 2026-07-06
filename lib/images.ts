import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { FULL_QUALITY, PROCESSED_DIR, THUMB_WIDTH, derivativePath } from './config';

export interface ProcessedImage {
  width: number; // visual dimensions of the derivative (EXIF orientation applied)
  height: number;
  mimeType: string; // mime type of the original source
}

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tiff: 'image/tiff',
  gif: 'image/gif',
  avif: 'image/avif',
  heif: 'image/heif',
};

const ensureDirs = async () => {
  await fs.mkdir(path.join(PROCESSED_DIR, 'full'), { recursive: true });
  await fs.mkdir(path.join(PROCESSED_DIR, 'thumb'), { recursive: true });
};

/// True when both derivatives already exist on disk (used to skip re-encoding
/// during the startup reconciliation sweep).
export async function derivativesExist(filename: string): Promise<boolean> {
  try {
    await Promise.all([
      fs.access(derivativePath('full', filename)),
      fs.access(derivativePath('thumb', filename)),
    ]);
    return true;
  } catch {
    return false;
  }
}

/// Generate the compressed full-size JPEG and the thumbnail for a source image.
/// Returns the derivative's visual dimensions and the source mime type.
export async function processImage(sourcePath: string, filename: string): Promise<ProcessedImage> {
  await ensureDirs();

  const format = (await sharp(sourcePath).metadata()).format ?? 'jpeg';
  const mimeType = MIME_BY_FORMAT[format] ?? 'application/octet-stream';

  // Full: original dimensions, re-encoded with mozjpeg. `.rotate()` bakes in the
  // EXIF orientation so the stored dimensions match what's displayed.
  const fullInfo = await sharp(sourcePath, { failOn: 'none' })
    .rotate()
    .jpeg({ quality: FULL_QUALITY, mozjpeg: true })
    .toFile(derivativePath('full', filename));

  // Thumbnail: capped width, never upscaled.
  await sharp(sourcePath, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(derivativePath('thumb', filename));

  return { width: fullInfo.width, height: fullInfo.height, mimeType };
}
