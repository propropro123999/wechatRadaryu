import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import article from '../api/fetch-article.js';
import proxy from '../api/proxy-image.js';

const response = () => ({code: 200, headers: {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, setHeader(name, value) { this.headers[name] = value; }, send(data) { this.data = data; return this; }});
const call = async (handler, url, headers) => {
  const res = response();
  await handler({query: {url}, headers: {host: 'tools.example', ...headers}}, res);
  return res;
};
assert.equal((await call(article, 'https://mp.weixin.qq.com/s/test', {origin: 'https://editor.example'})).code, 403);
assert.equal((await call(article, '', {origin: 'https://tools.example'})).code, 400);
assert.equal((await call(article, 'https://example.com/', {referer: 'https://tools.example/article-formatter'})).code, 400);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('<article>test</article>');
  const result = await call(article, 'https://mp.weixin.qq.com/s/test', {'sec-fetch-site': 'same-origin'});
  assert.equal(result.code, 200);
  assert.equal(result.data.html, '<article>test</article>');
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: article handler rejects cross-origin/missing/invalid URLs and accepts same-origin');

for (const url of ['', 'http://127.0.0.1/x', 'http://[::1]/', 'http://169.254.169.254/', 'http://localhost/', 'file:///etc/passwd', 'http://10.0.0.1/', 'http://2130706433/']) {
  assert.equal((await call(proxy, url, {origin: 'https://editor.example'})).code, 400);
}
const originalGet = https.get;
try {
  https.get = (_url, _options, callback) => {
    const upstream = new EventEmitter();
    queueMicrotask(() => {
      const res = new EventEmitter();
      res.statusCode = 200;
      res.headers = {'content-type': 'image/png'};
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
} finally { https.get = originalGet; }
console.log('PASS: cross-origin image proxy allowed; private/loopback/link-local/scheme targets rejected');
