import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../orc-log-parser.html', import.meta.url), 'utf8');
assert.doesNotMatch(html, /railway\.app/i);
const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(match => match[2].includes('window.fallbackToServer'))[2];
for (const scenario of ['success', 'network', 'server', 'timeout', 'bad-file', 'oversize']) {
  const calls = [], generated = [], errors = [];
  const context = {
    document: {addEventListener() {}, getElementById() { return null; }},
    window: {}, location: {origin: 'https://tools.example', href: 'https://tools.example/orc-log-parser'},
    FormData, URL, AbortSignal, console,
    fetch: async url => {
      calls.push(url);
      if (scenario === 'network') throw new Error('offline');
      if (scenario === 'timeout') throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
      const status = scenario === 'success' ? 200 : {server: 503, 'bad-file': 400}[scenario];
      return {status, ok: status === 200, url: new URL(url, 'https://tools.example').href, json: async () => status === 200 ? {data: [[1]]} : {error: 'test error'}};
    }
  };
  vm.createContext(context); vm.runInContext(script, context);
  context.window.updateFileStatus = (_id, message, type) => { if (type === 'error') errors.push(message); };
  context.window.generateExcel = data => generated.push(data);
  context.updateLoadedFilesList = () => {};
  context.log = () => {};
  const file = scenario === 'oversize' ? { size: 4 * 1024 * 1024 + 1, name: 'big.orc' } : new Blob(['test']);
  await context.window.fallbackToServer(file, 'file');
  if (scenario === 'oversize') {
    assert.equal(calls.length, 0);
    assert.equal(generated.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /4 MB/);
  } else {
    assert.deepEqual(calls, ['/api/parse-orc']);
    assert.equal(generated.length, scenario === 'success' ? 1 : 0);
    assert.equal(errors.length, scenario === 'success' ? 0 : 1);
    if (scenario === 'timeout') assert.match(errors[0], /超时/);
  }
}
console.log('PASS: ORC uses same-origin /api/parse-orc only, blocks >4 MB before upload, and reports network/5xx/timeout/400 errors');
