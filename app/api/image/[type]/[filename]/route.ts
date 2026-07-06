import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { derivativePath, type DerivativeType } from '@/lib/config';

export const dynamic = 'force-dynamic';

const isDerivativeType = (value: string): value is DerivativeType =>
  value === 'full' || value === 'thumb';

/// Streams a processed derivative (full or thumbnail) from the processed volume.
export async function GET(_req: Request, ctx: RouteContext<'/api/image/[type]/[filename]'>) {
  const { type, filename } = await ctx.params;

  if (!isDerivativeType(type)) {
    return new Response('Not found', { status: 404 });
  }

  // derivativePath applies path.basename, preventing directory traversal.
  const filePath = derivativePath(type, filename);

  try {
    const { size } = await stat(filePath);
    const webStream = Readable.toWeb(createReadStream(filePath)) as WebReadableStream<Uint8Array>;
    return new Response(webStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
