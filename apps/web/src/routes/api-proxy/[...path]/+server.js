import { env } from '$env/dynamic/private';

const FORWARDED_HEADERS = [
  'accept',
  'authorization',
  'content-type',
  'x-forwarded-for',
  'x-real-ip',
  'x-vercel-forwarded-for',
];

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function proxy(event) {
  const apiUrl = env.API_INTERNAL_URL;
  if (!apiUrl) {
    return jsonError('API_INTERNAL_URL no está configurada', 500);
  }

  const path = event.params.path ? `/${event.params.path}` : '';
  if (path.split('/').includes('..')) {
    return jsonError('Ruta de API inválida', 400);
  }

  const target = new URL(`/api${path}${event.url.search}`, apiUrl);
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = event.request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = event.request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await event.request.arrayBuffer();
  const upstream = await fetch(target, { method, headers, body });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
