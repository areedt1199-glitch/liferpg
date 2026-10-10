// Next may normalize request.url to localhost. Host preserves the browser origin.
// Deployment proxies must preserve Host and sanitize forwarded protocol headers.
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (host) url.host = host;
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol === 'https' || protocol === 'http') url.protocol = `${protocol}:`;
  return url.origin;
}
