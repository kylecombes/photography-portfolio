import { Gallery } from '@/components/Gallery';
import { getPhotos } from '@/lib/photos';

// The gallery reflects the database, which changes as photos are ingested.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const photos = await getPhotos();

  if (photos.length === 0) {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <p className="text-sm text-neutral-500">No photos yet.</p>
      </main>
    );
  }

  return (
    <main className="min-h-full p-3 md:p-4">
      <Gallery photos={photos} />
    </main>
  );
}
