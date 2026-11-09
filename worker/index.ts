interface Env { ASSETS: { fetch(request: Request): Promise<Response> }; API_BASE_URL?: string; UPSTREAM_ORIGIN?: string; INTERNAL_API_TOKEN?: string }
const commonHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://relay.walletconnect.org wss://relay.walletconnect.org https://relay.walletconnect.com wss://relay.walletconnect.com https://rpc.walletconnect.org https://rpc.walletconnect.com https://verify.walletconnect.org https://verify.walletconnect.com https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://api.trongrid.io https://api.mainnet-beta.solana.com; frame-src https://verify.walletconnect.org https://verify.walletconnect.com; font-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
};
function json(message: string, status: number) { return Response.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function validBase(value?: string) { if (!value) return null; try { const url = new URL(value); if (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname))) return url; } catch {} return null; }
async function platePreview(request: Request) {
  if (!['GET','HEAD'].includes(request.method)) return json('Method not allowed.', 405);
  const input = new URL(request.url), image = input.searchParams.get('image') ?? '', auctionTypeId = input.searchParams.get('auctionTypeId') ?? '';
  const plateNumber = input.searchParams.get('plateno') ?? '', code = input.searchParams.get('code') ?? '', plateType = input.searchParams.get('platetype') ?? '';
  const width = input.searchParams.get('width') ?? '900', height = input.searchParams.get('height') ?? '700';
  const allowedAuctions = new Set(['12','16','18','23','27']), allowedSizes = new Set(['500','700','900','1600']);
  if (!/^\d{1,6}$/.test(image) || !allowedAuctions.has(auctionTypeId) || !/^\d{1,12}$/.test(plateNumber) || !/^[A-Za-z0-9-]{1,12}$/.test(code) || !/^[a-z0-9]{1,16}$/i.test(plateType) || !allowedSizes.has(width) || !allowedSizes.has(height)) return json('Invalid plate preview request.', 400);
  const upstream = new URL('https://apiv8.emiratesauction.net/api/Image/PlateOnCar');
  for (const [key,value] of Object.entries({ image, auctionTypeId, plateno: plateNumber, code, platetype: plateType, width, height, platform: 'web' })) upstream.searchParams.set(key,value);
  try {
    const response = await fetch(upstream, { method: request.method, headers: { Accept: 'image/png' }, signal: AbortSignal.timeout(15_000) });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.toLowerCase().startsWith('image/')) return json('Plate preview is temporarily unavailable.', 502);
    const headers = new Headers({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', 'X-Content-Type-Options': 'nosniff' });
    const length = response.headers.get('content-length'); if (length) headers.set('Content-Length', length);
    if (input.searchParams.get('download') === '1') headers.set('Content-Disposition', `attachment; filename="plate-${plateNumber}-${code}.png"`);
    return new Response(request.method === 'HEAD' ? null : response.body, { status: 200, headers });
  } catch { return json('Plate preview is temporarily unavailable.', 503); }
}
async function plateImage(request: Request) {
  if (!['GET','HEAD'].includes(request.method)) return json('Method not allowed.', 405);
  const input = new URL(request.url), auctionTypeId = input.searchParams.get('auctionTypeId') ?? '';
  const plateNumber = input.searchParams.get('plateno') ?? '', code = input.searchParams.get('code') ?? '';
  const formats: Record<string, { suffix: string; size: number }> = {
    '12': { suffix: 'fujns', size: 300 }, '16': { suffix: 'rakns', size: 301 }, '18': { suffix: 'umqns26', size: 300 },
    '23': { suffix: 'shjs25', size: 300 }, '27': { suffix: 'ajmns', size: 301 },
  };
  const format = formats[auctionTypeId];
  if (!format || !/^\d{1,12}$/.test(plateNumber) || !/^[A-Za-z0-9-]{1,12}$/.test(code)) return json('Invalid plate image request.', 400);
  const upstream = `https://cdn.emiratesauction.com/PLATES/${format.suffix}/${format.size}/${encodeURIComponent(code)}/${encodeURIComponent(plateNumber)}.png`;
  try {
    const response = await fetch(upstream, { method: request.method, headers: { Accept: 'image/png' }, signal: AbortSignal.timeout(15_000) });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.toLowerCase().startsWith('image/')) return json('Plate image is temporarily unavailable.', 502);
    return new Response(request.method === 'HEAD' ? null : response.body, { status: 200, headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return json('Plate image is temporarily unavailable.', 503); }
}
async function mapTile(request: Request) {
  if (!['GET','HEAD'].includes(request.method)) return json('Method not allowed.',405);
  const pathname=new URL(request.url).pathname,match=pathname.match(/^\/api\/v1\/public\/map-tile\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/);
  if(!match)return json('Invalid map tile request.',400);
  const zoom=Number(match[1]),x=Number(match[2]),y=Number(match[3]),limit=2**zoom;
  if(!Number.isInteger(zoom)||zoom<3||zoom>18||x<0||y<0||x>=limit||y>=limit)return json('Invalid map tile request.',400);
  try{
    const response=await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,{method:request.method,headers:{Accept:'image/png','User-Agent':'EmiratesAuctionV2/1.0 (map rendering)'},signal:AbortSignal.timeout(10_000)});
    if(!response.ok)return json('Map tile is temporarily unavailable.',502);
    return new Response(request.method==='HEAD'?null:response.body,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, stale-while-revalidate=604800','X-Content-Type-Options':'nosniff'}});
  }catch{return json('Map tile is temporarily unavailable.',503);}
}
async function geocode(request:Request){
  if(request.method!=='GET')return json('Method not allowed.',405);
  const query=(new URL(request.url).searchParams.get('q')??'').trim();
  if(query.length<3||query.length>160)return json('Enter a valid location.',400);
  const upstream=new URL('https://nominatim.openstreetmap.org/search');upstream.searchParams.set('q',query);upstream.searchParams.set('format','jsonv2');upstream.searchParams.set('limit','5');upstream.searchParams.set('countrycodes','ae');upstream.searchParams.set('addressdetails','1');
  try{
    const response=await fetch(upstream,{headers:{Accept:'application/json','Accept-Language':'en','User-Agent':'EmiratesAuctionV2/1.0 (delivery location search)'},signal:AbortSignal.timeout(10_000)});
    if(!response.ok)return json('Location search is temporarily unavailable.',502);
    const raw=await response.json() as Array<{display_name?:unknown;lat?:unknown;lon?:unknown}>;
    const items=raw.slice(0,5).map((item)=>({label:String(item.display_name??'').slice(0,500),latitude:Number(item.lat),longitude:Number(item.lon)})).filter((item)=>item.label&&Number.isFinite(item.latitude)&&Number.isFinite(item.longitude));
    return Response.json({items},{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
  }catch{return json('Location search is temporarily unavailable.',503);}
}
async function lotGallery(request: Request) {
  if (request.method !== 'GET') return json('Method not allowed.', 405);
  const source = new URL(request.url).searchParams.get('source') ?? '';
  let upstream: URL;
  try { upstream = new URL(source); } catch { return json('Invalid lot source.', 400); }
  if (upstream.protocol !== 'https:' || !['www.emiratesauction.com','emiratesauction.com'].includes(upstream.hostname) || !upstream.pathname.startsWith('/auctions/')) return json('Invalid lot source.', 400);
  try {
    const response = await fetch(upstream, { headers: { Accept: 'text/html', 'User-Agent': 'EmiratesAuctionV2/1.0' }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return Response.json({ items: [] }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    const html = await response.text(), items: string[] = [], specifications: Array<{ label: string; value: string }> = [];
    const addImage = (rawValue: string) => {
      const raw=rawValue.replaceAll('\\/','/').replaceAll('&amp;','&'); let image:URL; try{image=new URL(raw,upstream);}catch{return;}
      if(image.protocol!=='https:'||image.hostname!=='cdn.emiratesauction.com'||!image.pathname.startsWith('/media/')||!/\/images\.(?:jpg|jpeg|png|webp)$/i.test(image.pathname))return;
      const normalized=image.toString().replace(/w_(?:%5Bw%5D|\[w\]|\d+),h_(?:%5Bh%5D|\[h\]|\d+)/i,'w_1600,h_1200');if(!items.includes(normalized)&&items.length<500)items.push(normalized);
    };
    for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
      const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
      if (!/\bPhoto\s+\d+\b/i.test(alt) || /Thumbnail/i.test(alt)) continue;
      const raw = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]?.replaceAll('&amp;','&') ?? '';
      if (!raw) continue;
      let image: URL; try { image = new URL(raw, upstream); } catch { continue; }
      if (image.protocol !== 'https:' || image.hostname !== 'cdn.emiratesauction.com' || !image.pathname.startsWith('/media/') || !/\/images\.(?:jpg|jpeg|png|webp)$/i.test(image.pathname)) continue;
      addImage(image.toString()); if (items.length >= 500) break;
    }
    const nextData=html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if(nextData) try {
      const root=JSON.parse(nextData) as unknown, visit=(value:unknown,inGallery=false):void=>{
        if(!value||typeof value!=='object'||items.length>=500)return;
        if(Array.isArray(value)){for(const entry of value)visit(entry,inGallery);return;}
        const object=value as Record<string,unknown>, gallery=inGallery||object.ViewTypeId===5;
        if(gallery&&typeof object.ImageLink==='string')addImage(object.ImageLink);
        for(const entry of Object.values(object))visit(entry,gallery);
      }; visit(root);
    } catch {}
    const decode = (value: string) => { try { return JSON.parse(`"${value.replaceAll('"','\\"')}"`) as string; } catch { return value; } };
    const decodeHtml = (value: string) => value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
    const allowedLabels = new Set(['Make','Model','Year','Body Type','Color','Exterior','Doors','Seats','Odometer','Transmission','Keys','Manufactured in']);
    for (const object of html.match(/\{[^{}]{0,1200}"TagName":"[^"]+"[^{}]{0,1200}\}/g) ?? []) {
      const label = object.match(/"TagName":"([^"]+)"/)?.[1] ?? '', value = object.match(/"Title":"([^"]+)"/)?.[1] ?? '';
      const decodedLabel=decode(label), decodedValue=decode(value); if (allowedLabels.has(decodedLabel)&&decodedValue&&!specifications.some((item)=>item.label===decodedLabel)) specifications.push({label:decodedLabel,value:decodedValue});
    }
    for (const label of allowedLabels) {
      if (specifications.some((item)=>item.label===label)) continue;
      const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=html.match(new RegExp(`>${escaped}<\\/span>[\\s\\S]{0,500}?title="([^"]+)"`,'i'));
      if(match?.[1]) specifications.push({label,value:decodeHtml(match[1])});
    }
    const descriptionRaw=html.match(/"DescriptionSeo":"((?:\\.|[^"\\])*)"/)?.[1]??'';
    const metaDescription=html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]??'';
    const description=decode(descriptionRaw)||decodeHtml(metaDescription);
    return Response.json({ items, specifications, description }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return Response.json({ items: [], specifications: [], description: '' }, { headers: { 'Cache-Control': 'public, max-age=60' } }); }
}
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
    for (const name of ['content-type','content-length','content-disposition','location','retry-after']) { const value = response.headers.get(name); if (value) output.set(name, value); }
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
  const url = new URL(request.url);
  if (url.pathname === '/api/v1/public/plate-preview') return platePreview(request);
  if (url.pathname === '/api/v1/public/plate-image') return plateImage(request);
  if (url.pathname.startsWith('/api/v1/public/map-tile/')) return mapTile(request);
  if (url.pathname === '/api/v1/public/geocode') return geocode(request);
  if (url.pathname === '/api/v1/public/lot-gallery') return lotGallery(request);
  if (url.pathname.startsWith('/api/')) return proxy(request, env);
  const response = await env.ASSETS.fetch(request), headers = new Headers(response.headers); for (const [key,value] of Object.entries(commonHeaders)) headers.set(key,value);
  headers.set('X-Robots-Tag', url.hostname.endsWith('.workers.dev') ? 'noindex, nofollow' : 'index, follow');
  if (/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2)$/.test(url.pathname)) headers.set('Cache-Control','public, max-age=31536000, immutable');
  return new Response(response.body, { status: response.status, headers });
} };
