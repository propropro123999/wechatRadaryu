import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import article from '../api/fetch-article.js';
import proxy from '../api/proxy-image.js';
import upload from '../api/upload-image.js';

const response = () => ({code: 200, headers: {}, ended: false, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, setHeader(name, value) { this.headers[name] = value; }, send(data) { this.data = data; return this; }, end() { this.ended = true; return this; }});
const call = async (handler, url, headers) => {
  const res = response();
  await handler({method: 'GET', query: {url}, headers: {host: 'tools.example', ...headers}}, res);
  return res;
};
const callUpload = async (body, headers = {}, method = 'POST') => {
  const res = response();
  await upload({method, body, headers: {host: 'tools.example', ...headers}}, res);
  return res;
};
assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {origin: 'https://editor.example'})).code, 403);
assert.equal((await call(article, '', {origin: 'https://tools.example'})).code, 400);
assert.equal((await call(article, 'https://example.com/', {referer: 'https://tools.example/article-formatter'})).code, 400);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('<div id="js_content">test</div>');
  const result = await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'});
  assert.equal(result.code, 200);
  assert.equal(result.data.html, '<div id="js_content">test</div>');
  globalThis.fetch = async () => new Response('<div id="js_content">test</div><script>large upstream script</script>');
  assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'})).data.html, '<div id="js_content">test</div>');
  for (const invalid of ['javascript://mp.weixin.qq.com/s/test', 'https://mp.weixin.qq.com.evil.test/s/test', 'https://user@mp.weixin.qq.com/s/test', 'https://mp.weixin.qq.com:444/s/test', 'https://mp.weixin.qq.com/']) {
    assert.equal((await call(article, invalid, {'sec-fetch-site': 'same-origin'})).code, 400);
  }
  globalThis.fetch = async () => new Response('<h2>环境异常</h2><p>完成验证后即可继续访问</p>');
  const captcha = await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'});
  assert.equal(captcha.code, 422);
  assert.match(captcha.data.error, /安全验证/);
  for (const body of ['', '<p>该内容已被发布者删除</p>']) {
    globalThis.fetch = async () => new Response(body);
    assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'})).code, 422);
  }
  for (const status of [302, 403, 500]) {
    globalThis.fetch = async () => new Response('', {status});
    assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'})).code, 502);
  }
  globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
  const timeout = await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'});
  assert.equal(timeout.code, 502);
  assert.match(timeout.data.error, /超时/);
  globalThis.fetch = async () => { throw new Error('network'); };
  assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'})).code, 502);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: article handler rejects cross-origin/missing/invalid URLs and accepts same-origin');
console.log('PASS: article handler reports verification, empty/deleted content, upstream errors and timeout in Chinese');

for (const url of ['', 'http://127.0.0.1/x', 'http://[::1]/', 'http://169.254.169.254/', 'http://localhost/', 'file:///etc/passwd', 'http://10.0.0.1/', 'http://2130706433/']) {
  assert.equal((await call(proxy, url, {origin: 'https://editor.example'})).code, 400);
}
const postProxyRes = response();
await proxy({method: 'POST', query: {url: 'https://8.8.8.8/image.png'}, headers: {host: 'tools.example'}}, postProxyRes);
assert.equal(postProxyRes.code, 405);

const originalGet = https.get;
try {
  let mockContentType = 'image/png';
  let mockContentLength;
  https.get = (_url, _options, callback) => {
    const upstream = new EventEmitter();
    upstream.destroy = () => {};
    queueMicrotask(() => {
      const res = new EventEmitter();
      res.destroy = () => {};
      res.statusCode = 200;
      res.headers = {'content-type': mockContentType};
      if (mockContentLength !== undefined) res.headers['content-length'] = String(mockContentLength);
      callback(res);
      res.emit('data', Buffer.from('test-image'));
      res.emit('end');
      upstream.emit('close');
    });
    return upstream;
  };
  const result = await call(proxy, 'https://8.8.8.8/image.png', {origin: 'https://editor.example'});
  assert.equal(result.code, 200);
  assert.equal(result.data.toString(), 'test-image');
  assert.equal(result.headers['Content-Type'], 'image/png');
  assert.match(result.headers['Cache-Control'], /s-maxage=86400/);
  assert.match(result.headers['Content-Security-Policy'], /sandbox/);

  mockContentType = 'image/svg+xml';
  assert.equal((await call(proxy, 'https://8.8.8.8/xss.svg', {origin: 'https://editor.example'})).code, 502);

  mockContentType = 'image/png';
  mockContentLength = 4 * 1024 * 1024 + 1;
  const oversize = await call(proxy, 'https://8.8.8.8/large.png', {origin: 'https://editor.example'});
  assert.equal(oversize.code, 502);
  assert.match(oversize.data.error, /4 MB/);
} finally { https.get = originalGet; }
console.log('PASS: image proxy enforces 4 MB limit, blocks SVG/private targets, and sets CDN s-maxage + sandbox CSP');

// Upload handler: same-origin, MIME whitelist, size limit, and Catbox response validation.
assert.equal((await callUpload({image: 'data:image/png;base64,AAAA'}, {origin: 'https://evil.example'})).code, 403);
assert.equal((await callUpload({image: 'data:image/png;base64,AAAA'}, {})).code, 403);
assert.equal((await callUpload({image: 'data:image/png;base64,AAAA'}, {'sec-fetch-site': 'same-origin'}, 'GET')).code, 405);
assert.equal((await callUpload({}, {'sec-fetch-site': 'same-origin'})).code, 400);
assert.equal((await callUpload({image: 'data:text/html;base64,PHNjcmlwdD4='}, {'sec-fetch-site': 'same-origin'})).code, 400);
assert.equal((await callUpload({image: 'data:image/svg+xml;base64,PHN2Zz4='}, {'sec-fetch-site': 'same-origin'})).code, 400);
assert.equal((await callUpload({image: 'data:image/png\r\nX-Inject: 1;base64,AAAA'}, {'sec-fetch-site': 'same-origin'})).code, 400);
assert.equal((await callUpload({image: 'data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024)}, {'sec-fetch-site': 'same-origin'})).code, 413);

const originalRequest = https.request;
try {
  let mockBody = 'https://files.catbox.moe/abc123.png';
  https.request = (_options, callback) => {
    const req = new EventEmitter();
    req.write = () => {};
    req.destroy = err => req.emit('error', err);
    req.end = () => {
      queueMicrotask(() => {
        const res = new EventEmitter();
        callback(res);
        res.emit('data', mockBody);
        res.emit('end');
        req.emit('close');
      });
    };
    return req;
  };
  const ok = await callUpload({image: 'data:image/png;base64,AAAA'}, {'sec-fetch-site': 'same-origin'});
  assert.equal(ok.code, 200);
  assert.equal(ok.data.url, 'https://files.catbox.moe/abc123.png');
  assert.equal(ok.headers['Cache-Control'], 'no-store');

  mockBody = 'https://attacker.example/evil.png';
  assert.equal((await callUpload({image: 'data:image/png;base64,AAAA'}, {origin: 'https://tools.example'})).code, 502);
} finally { https.request = originalRequest; }
console.log('PASS: upload handler enforces same-origin, image MIME whitelist, 4 MB limit, and Catbox URL check');
