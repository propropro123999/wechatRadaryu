import { cookieName, sameOrigin, json } from '../lib/auth.js';
export const config = {runtime: 'edge'};
export default function logout(request) {
  if (request.method !== 'POST') return json({error: '仅支持 POST'}, 405);
  if (!sameOrigin(request)) return json({error: '仅允许同源请求'}, 403);
  return json({ok: true}, 200, {'Set-Cookie': `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`});
}
