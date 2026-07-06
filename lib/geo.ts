import maxmind, { type CityResponse, type Reader } from 'maxmind';

export interface CoarseLocation {
  city: string | null;
  region: string | null;
  country: string | null;
}

// Lazily open the GeoLite2-City database once. If GEOLITE_DB is unset or the
// file can't be opened, geolocation is simply disabled (reader stays null).
let readerPromise: Promise<Reader<CityResponse> | null> | undefined;

function getReader(): Promise<Reader<CityResponse> | null> {
  if (readerPromise) return readerPromise;
  const dbPath = process.env.GEOLITE_DB;
  if (!dbPath) {
    readerPromise = Promise.resolve(null);
    return readerPromise;
  }
  readerPromise = maxmind.open<CityResponse>(dbPath).catch(() => null);
  return readerPromise;
}

/// Resolve an IP to a coarse city/region/country. Returns null when geolocation
/// is disabled or the IP can't be resolved. The IP itself is never stored.
export async function lookupCity(ip: string | null): Promise<CoarseLocation | null> {
  if (!ip) return null;
  const reader = await getReader();
  if (!reader) return null;
  try {
    const result = reader.get(ip);
    if (!result) return null;
    return {
      city: result.city?.names?.en ?? null,
      region: result.subdivisions?.[0]?.names?.en ?? null,
      country: result.country?.names?.en ?? null,
    };
  } catch {
    return null;
  }
}
