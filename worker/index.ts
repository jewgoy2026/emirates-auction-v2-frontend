interface Env { ASSETS: Fetcher; API_BASE_URL?: string; UPSTREAM_ORIGIN?: string; INTERNAL_API_TOKEN?: string }
const commonHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
};
function json(message: string, status: number) { return Response.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function validBase(value?: string) { if (!value) return null; try { const url = new URL(value); if (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname))) return url; } catch {} return null; }
async function proxy(request: Request, env: Env) {
  const requestUrl = new URL(request.url), base = validBase(env.API_BASE_URL); if (!base) return json('The service API is not configured.', 503);
  if (!env.INTERNAL_API_TOKEN || env.INTERNAL_API_TOKEN.length < 48) return json('The service gateway is not configured.', 503);
  if (!['GET','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method)) return json('Method not allowed.', 405);
  if (!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.get('origin') !== requestUrl.origin) return json('Invalid request origin.', 403);
  const upstreamUrl = new URL(requestUrl.pathname.slice(4) + requestUrl.search, base), headers = new Headers();
  for (const name of ['accept','content-type','cookie','user-agent']) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  headers.set('x-internal-api-token', env.INTERNAL_API_TOKEN);
  headers.set('origin', env.UPSTREAM_ORIGIN || requestUrl.origin); headers.set('x-forwarded-host', requestUrl.host); headers.set('x-forwarded-proto', requestUrl.protocol.slice(0,-1));
  try {
    const response = await fetch(upstreamUrl, { method: request.method, headers, body: ['GET','HEAD'].includes(request.method) ? undefined : request.body, redirect: 'manual', signal: AbortSignal.timeout(15_000) }), output = new Headers();
    for (const name of ['content-type','content-length','location','retry-after']) { const value = response.headers.get(name); if (value) output.set(name, value); }
    const publicRead = request.method === 'GET' && response.ok && (
      requestUrl.pathname === '/api/v1/auction/categories' ||
      requestUrl.pathname === '/api/v1/auction/catalog' ||
      requestUrl.pathname.startsWith('/api/v1/auction/lots/') ||
      requestUrl.pathname === '/api/v1/payment/rails'
    );
    output.set('Cache-Control', publicRead ? 'public, max-age=15' : 'no-store'); output.set('X-Content-Type-Options','nosniff');
    const cookies = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')!] : []);
    for (const cookie of cookies) output.append('Set-Cookie', cookie.replace(/Path=\/v1\/auth/gi,'Path=/api/v1/auth'));
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return json('The service is temporarily unavailable.', 503); }
}
export default { async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url); if (url.pathname.startsWith('/api/')) return proxy(request, env);
  const response = await env.ASSETS.fetch(request), headers = new Headers(response.headers); for (const [key,value] of Object.entries(commonHeaders)) headers.set(key,value);
  headers.set('X-Robots-Tag', url.hostname.endsWith('.workers.dev') ? 'noindex, nofollow' : 'index, follow');
  if (/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2)$/.test(url.pathname)) headers.set('Cache-Control','public, max-age=31536000, immutable');
  return new Response(response.body, { status: response.status, headers });
} } satisfies ExportedHandler<Env>;
