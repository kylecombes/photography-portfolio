import path from 'node:path';

// The ingest folder (bind-mounted into the container). Defaults to the container path.
export const INGEST_DIR = process.env.INGEST_DIR ?? '/ingest';

// Derivative output. Fixed internal container path in production; overridable only
// so the app can run outside Docker during local development.
export const PROCESSED_DIR = process.env.PROCESSED_DIR ?? '/processed';

export const THUMB_WIDTH = Number(process.env.THUMB_WIDTH ?? 600);
export const FULL_QUALITY = Number(process.env.FULL_QUALITY ?? 70);

export type DerivativeType = 'full' | 'thumb';

export const derivativePath = (type: DerivativeType, filename: string) =>
  path.join(PROCESSED_DIR, type, path.basename(filename));
