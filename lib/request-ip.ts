/// The client IP as forwarded by Caddy. `X-Forwarded-For` may contain a list;
/// the first entry is the original client.
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() ?? null;
}
