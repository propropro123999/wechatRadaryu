import { next } from '@vercel/functions';
import { pages, settings, session, sameOrigin, json, unavailable } from './lib/auth.js';
export const config = { runtime: 'edge' };
export default async function middleware(request) {
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/'; } catch { return json({error: '无效路径'}, 400); }
  const tool = pages[path.slice(1).replace(/\.html$/, '')];
  const apiPath = path.replace(/\.(js|py)$/, '');
  const apiTool = {'/api/upload-image': 'word-parser', '/api/parse-orc': 'orc-parser'}[apiPath];
  const publicApi = ['/api/fetch-article', '/api/proxy-image'].includes(apiPath);
  if (publicApi && !sameOrigin(request)) return json({error: '仅允许同源请求'}, 403);
  if (!tool && !apiTool) return next();
  let auth;
  try { auth = settings(); } catch { return unavailable(!tool); }
  const grants = await session(request, auth.secret);
  if (!grants.includes(tool || apiTool)) {
    if (apiTool) return json({error: '请先登录授权工具'}, 401);
    return new Response(null, {status: 302, headers: {Location: '/login.html?' + new URLSearchParams({tool, next: url.pathname + url.search}), 'Cache-Control': 'no-store'}});
  }
  const response = next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
