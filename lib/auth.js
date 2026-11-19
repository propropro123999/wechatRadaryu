export const pages = {
  'content-dashboard': 'content-analysis', 'bandao-ops-dashboard': 'bandaoquantiezi',
  'page-traffic-dashboard': 'page-traffic', youmeng: 'youmeng-traffic',
  'yiban-dashboard': 'yiban-analysis', 'image-compress': 'image-compress',
  'orc-log-parser': 'orc-parser', 'pdf-compress': 'pdf-compress', 'word-to-html': 'word-parser'
};
export const tools = Object.values(pages);
export const cookieName = '__Host-tool_auth';
export const lifetime = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
export function settings() {
  if (!process.env.AUTH_SECRET || !process.env.AUTH_CODES) throw new Error('授权服务未配置：请设置 AUTH_SECRET 和 AUTH_CODES');
  const data = JSON.parse(process.env.AUTH_CODES);
  if (!data.tools || typeof data.tools !== 'object' || Array.isArray(data.tools)) throw new Error('AUTH_CODES 格式错误');
  for (const entry of Object.values(data.tools)) {
    if (!entry || !entry.codes || typeof entry.codes !== 'object' || Array.isArray(entry.codes)) throw new Error('AUTH_CODES 格式错误');
  }
  return { secret: process.env.AUTH_SECRET, codes: data.tools };
}
const base64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unbase64 = str => Uint8Array.from(atob(str.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
export async function equal(a, b) {
  const digest = value => crypto.subtle.digest('SHA-256', encoder.encode(value));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  const left = new Uint8Array(x), right = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}
export async function sign(grants, secret, exp = Math.floor(Date.now() / 1000) + lifetime) {
  const payload = base64(encoder.encode(JSON.stringify({tools: grants, exp})));
  return payload + '.' + base64(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload))));
}
export async function session(request, secret) {
  try {
    const token = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!token || token.length > 4096) return [];
    const [payload, signature, extra] = token.split('.');
    if (extra || !signature || !await crypto.subtle.verify('HMAC', await key(secret), unbase64(signature), encoder.encode(payload))) return [];
    const data = JSON.parse(new TextDecoder().decode(unbase64(payload)));
    if (!Number.isFinite(data.exp) || data.exp <= Date.now() / 1000 || !Array.isArray(data.tools)) return [];
    return data.tools.filter(tool => tools.includes(tool));
  } catch { return []; }
}
export function sameOrigin(request) {
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true;
  for (const name of ['origin', 'referer']) {
    try { if (new URL(request.headers.get(name)).origin === new URL(request.url).origin) return true; } catch {}
  }
  return false;
}
export function json(data, status = 200, headers = {}) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});
}
export function unavailable(api = true) {
  const error = '授权服务未配置或配置无效，请管理员检查 AUTH_SECRET 和 AUTH_CODES';
  return api ? json({error}, 503) : new Response('<!doctype html><meta charset="utf-8"><h1>' + error + '</h1>', {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
}
