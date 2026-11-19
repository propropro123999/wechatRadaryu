import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import middleware from '../middleware.js';
import login from '../api/login.js';
import logout from '../api/logout.js';
import proxy from '../api/proxy-image.js';
import { pages, tools, sign, cookieName } from '../lib/auth.js';

process.env.AUTH_SECRET = 'test-only-signing-material-not-for-deployment';
process.env.AUTH_CODES = JSON.stringify({tools: Object.fromEntries(tools.map(tool => [tool, {codes: {[`test-${tool}`]: 'test'}}]))});
process.env.AUTH_MASTER_PASSWORD = 'test-only-master';
const request = (path, cookie = '', headers = {}) => new Request(`https://tools.example${path}`, {headers: {cookie, ...headers}});
const attempt = (tool, code, cookie = '') => login(new Request('https://tools.example/api/login', {method: 'POST', headers: {origin: 'https://tools.example', cookie}, body: JSON.stringify({tool, code})}));
const passes = async (path, cookie) => assert.equal((await middleware(request(path, cookie))).headers.get('x-middleware-next'), '1');
for (const [page, tool] of Object.entries(pages)) {
  for (const suffix of ['', '.html']) {
    const result = await middleware(request('/' + page + suffix));
    assert.equal(result.status, 302);
    assert.equal(new URL(result.headers.get('location'), 'https://tools.example').searchParams.get('tool'), tool);
  }
}
console.log('PASS: all 18 gated page paths redirect without cookie');
for (const page of ['/', '/index.html', '/article-formatter.html', '/image-stitch.html', '/login.html']) await passes(page);
console.log('PASS: public pages pass');
assert.equal((await attempt('word-parser', 'wrong')).status, 401);
assert.equal((await attempt('word-parser', '')).status, 400);
assert.equal((await login(new Request('https://tools.example/api/login', {method: 'POST', headers: {origin: 'https://tools.example'}, body: '{'}))).status, 400);
let result = await attempt('word-parser', 'test-word-parser');
assert.equal(result.status, 200);
const setCookie = result.headers.get('set-cookie');
for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000']) assert.ok(setCookie.includes(flag));
const cookie = setCookie.split(';')[0];
await passes('/word-to-html.html', cookie);
assert.equal((await middleware(request('/orc-log-parser', cookie))).status, 302);
result = await attempt('orc-parser', 'test-orc-parser', cookie);
const merged = result.headers.get('set-cookie').split(';')[0];
await passes('/word-to-html', merged); await passes('/orc-log-parser', merged);
console.log('PASS: wrong/empty/malformed codes rejected; tool isolation, cookie flags and grant merging');
result = await attempt('word-parser', process.env.AUTH_MASTER_PASSWORD);
const master = result.headers.get('set-cookie').split(';')[0];
for (const page of Object.keys(pages)) await passes('/' + page + '.html', master);
console.log('PASS: master grants all tools');
const expired = `${cookieName}=${await sign(['word-parser'], process.env.AUTH_SECRET, Math.floor(Date.now() / 1000) - 1)}`;
for (const invalid of [cookie.slice(0, -2) + 'xx', expired]) assert.equal((await middleware(request('/word-to-html', invalid))).status, 302);
assert.equal((await middleware(request('/api/upload-image'))).status, 401);
assert.equal((await middleware(request('/api/parse-orc'))).status, 401);
await passes('/api/upload-image', cookie);
assert.equal(logout(new Request('https://tools.example/api/logout', {method: 'POST', headers: {origin: 'https://tools.example'}})).headers.get('set-cookie').includes('Max-Age=0'), true);
console.log('PASS: tampered/expired tokens rejected, API gating and logout');
for (const key of ['AUTH_SECRET', 'AUTH_CODES']) {
  const saved = process.env[key]; delete process.env[key];
  assert.equal((await middleware(request('/word-to-html', master))).status, 503);
  assert.equal((await attempt('word-parser', 'test-word-parser')).status, 503);
  process.env[key] = saved;
}
const saved = process.env.AUTH_CODES; process.env.AUTH_CODES = '{';
assert.equal((await middleware(request('/word-to-html'))).status, 503); process.env.AUTH_CODES = saved;
console.log('PASS: missing/invalid configuration fails closed');
for (const path of ['/api/fetch-article']) {
  assert.equal((await middleware(request(path, '', {origin: 'https://attacker.example'}))).status, 403);
  assert.equal((await middleware(request(path, '', {origin: 'https://tools.example'}))).headers.get('x-middleware-next'), '1');
}
assert.equal((await middleware(request('/api/proxy-image', '', {origin: 'https://editor.example'}))).headers.get('x-middleware-next'), '1');
const proxyResult = async (url, headers) => {
  const res = {code: 200, headers: {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, setHeader(name, value) { this.headers[name] = value; }, send(data) { this.data = data; return this; }};
  await proxy({query: {url}, headers}, res);
  return res;
};
for (const url of ['http://127.0.0.1/x', 'http://[::1]/', 'http://169.254.169.254/', 'http://localhost/', 'file:///etc/passwd', 'http://10.0.0.1/', 'http://2130706433/']) {
  assert.equal((await proxyResult(url, {host: 'tools.example', origin: 'https://editor.example'})).code, 400);
}
const originalGet = https.get;
try {
  https.get = (_url, _options, callback) => {
    const upstream = new EventEmitter();
    queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.headers = {'content-type': 'image/png'};
      callback(response);
      response.emit('data', Buffer.from('test-image'));
      response.emit('end');
      upstream.emit('close');
    });
    return upstream;
  };
  const result = await proxyResult('https://8.8.8.8/image.png', {host: 'tools.example', origin: 'https://editor.example'});
  assert.equal(result.code, 200);
  assert.equal(result.data.toString(), 'test-image');
  assert.equal(result.headers['Content-Type'], 'image/png');
} finally { https.get = originalGet; }
assert.equal((await proxyResult('', {host: 'tools.example', 'sec-fetch-site': 'same-origin'})).code, 400);
console.log('PASS: article fetch same-origin enforcement; cross-origin image proxy allowed; private/loopback/link-local/scheme targets rejected');
