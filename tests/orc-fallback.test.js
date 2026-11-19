import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../orc-log-parser.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(match => match[2].includes('window.fallbackToServer'))[2];
for (const scenario of ['success', 'network', 'server', 'unauthorized', 'bad-file']) {
  const calls = [], generated = [], errors = [];
  const context = {
    document: {addEventListener() {}, getElementById() { return null; }},
    window: {}, location: {origin: 'https://tools.example', href: 'https://tools.example/orc-log-parser'},
    FormData, URL, console,
    fetch: async url => {
      calls.push(url);
      if (calls.length === 1 && scenario === 'network') throw new Error('offline');
      const status = calls.length > 1 || scenario === 'success' ? 200 : {server: 503, unauthorized: 401, 'bad-file': 400}[scenario];
      return {status, ok: status === 200, url: new URL(url, 'https://tools.example').href, json: async () => status === 200 ? {data: [[1]]} : {error: 'test error'}};
    }
  };
  vm.createContext(context); vm.runInContext(script, context);
  context.window.updateFileStatus = (_id, message, type) => { if (type === 'error') errors.push(message); };
  context.window.generateExcel = data => generated.push(data);
  context.updateLoadedFilesList = () => {};
  context.log = () => {};
  await context.window.fallbackToServer(new Blob(['test']), 'file');
  assert.equal(calls[0], '/api/parse-orc');
  assert.equal(calls.length, ['network', 'server'].includes(scenario) ? 2 : 1);
  if (calls.length === 2) assert.match(calls[1], /^https:\/\/.*\.up\.railway\.app\/api\/parse-orc$/);
  assert.equal(generated.length, ['unauthorized', 'bad-file'].includes(scenario) ? 0 : 1);
  assert.equal(errors.length, ['unauthorized', 'bad-file'].includes(scenario) ? 1 : 0);
}
console.log('PASS: ORC uses same-origin first; network/5xx fall back to Railway; 401/400 never fall back');
