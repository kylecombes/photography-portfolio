import fs from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { extractExif } from '@/lib/exif';
import { derivativesExist, processImage } from '@/lib/images';

const SUPPORTED = /\.(jpe?g|png|webp|tiff?|avif|heif)$/i;

export const isSupportedImage = (filename: string): boolean => SUPPORTED.test(filename);

/// Process a single source image and upsert its record. Keyed by filename, so
/// re-running is idempotent. When `skipIfDone` is set (startup reconciliation),
/// files that already have both derivatives and a DB row are left untouched.
export async function ingestFile(
  filePath: string,
  skipIfDone = false,
): Promise<'ingested' | 'skipped'> {
  const filename = path.basename(filePath);
  if (!isSupportedImage(filename)) return 'skipped';

  if (skipIfDone) {
    const [hasDerivatives, existing] = await Promise.all([
      derivativesExist(filename),
      prisma.photo.findUnique({ where: { filename }, select: { filename: true } }),
    ]);
    if (hasDerivatives && existing) return 'skipped';
  }

  const stat = await fs.stat(filePath);
  const { width, height, mimeType } = await processImage(filePath, filename);
  const { exif, takenAt } = await extractExif(filePath);

  const data = {
    mimeType,
    sizeBytes: stat.size,
    width,
    height,
    takenAt,
    exif: exif as Prisma.InputJsonValue,
  };

  await prisma.photo.upsert({
    where: { filename },
    create: { filename, ...data },
    update: data,
  });

  return 'ingested';
}
