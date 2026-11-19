import { tools, settings, equal, session, sign, cookieName, lifetime, sameOrigin, json, unavailable } from '../lib/auth.js';
export const config = {runtime: 'edge'};
export default async function login(request) {
  if (request.method !== 'POST') return json({error: '仅支持 POST'}, 405);
  if (!sameOrigin(request)) return json({error: '仅允许同源请求'}, 403);
  let auth;
  try { auth = settings(); } catch { return unavailable(); }
  let body;
  try {
    if (Number(request.headers.get('content-length')) > 8192) return json({error: '请求过大'}, 413);
    const text = await request.text();
    if (text.length > 8192) return json({error: '请求过大'}, 413);
    body = JSON.parse(text);
  } catch { return json({error: '无效 JSON'}, 400); }
  if (!tools.includes(body?.tool) || typeof body.code !== 'string' || !body.code) return json({error: '请选择工具并输入授权码'}, 400);
  let valid = false;
  for (const code of Object.keys(auth.codes[body.tool]?.codes || {})) valid = (await equal(code, body.code)) || valid;
  const master = process.env.AUTH_MASTER_PASSWORD ? await equal(process.env.AUTH_MASTER_PASSWORD, body.code) : false;
  if (!valid && !master) return json({error: '授权码无效'}, 401);
  const grants = [...new Set([...(await session(request, auth.secret)), ...(master ? tools : [body.tool])])];
  const token = await sign(grants, auth.secret);
  return json({ok: true}, 200, {'Set-Cookie': `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${lifetime}`});
}
