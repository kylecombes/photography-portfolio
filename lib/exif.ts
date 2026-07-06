import exifr from 'exifr';

/// EXIF tags that can identify the photographer or specific hardware. Stripped
/// before anything is stored. Any key containing "serial" is also dropped.
const SENSITIVE_KEYS = new Set([
  'SerialNumber',
  'BodySerialNumber',
  'InternalSerialNumber',
  'CameraSerialNumber',
  'LensSerialNumber',
  'OwnerName',
  'CameraOwnerName',
  'Artist',
  'Copyright',
  'HostComputer',
]);

const isBinary = (value: unknown): boolean =>
  value instanceof Uint8Array || ArrayBuffer.isView(value) || Buffer.isBuffer(value);

const shouldDrop = (key: string, value: unknown): boolean => {
  if (SENSITIVE_KEYS.has(key)) return true;
  if (/serial/i.test(key)) return true;
  if (isBinary(value)) return true; // e.g. embedded thumbnails, MakerNote blobs
  return false;
};

export interface ExtractedExif {
  exif: Record<string, unknown>;
  takenAt: Date | null;
}

/// Coerce an EXIF date value (Date or string) to a valid Date, or null.
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/// Strip sensitive/binary fields from a raw EXIF object, derive the capture time,
/// and normalize to plain JSON (Dates -> ISO strings) so it fits a JSONB column.
/// Pure and side-effect free — the file-reading part lives in `extractExif`.
export function sanitizeExif(raw: Record<string, unknown>): ExtractedExif {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    if (shouldDrop(key, value)) continue;
    sanitized[key] = value;
  }

  const takenAt = toDate(raw.DateTimeOriginal ?? raw.CreateDate);

  // Round-trip through JSON to flatten Dates and guarantee a JSON-safe value.
  const exif = JSON.parse(JSON.stringify(sanitized)) as Record<string, unknown>;

  return { exif, takenAt };
}

/// Parse EXIF from an image file, then sanitize it.
export async function extractExif(sourcePath: string): Promise<ExtractedExif> {
  let raw: Record<string, unknown> = {};
  try {
    raw = (await exifr.parse(sourcePath, { mergeOutput: true, makerNote: false })) ?? {};
  } catch {
    raw = {};
  }
  return sanitizeExif(raw);
}
