import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// Dependency downloads are shared, fail closed and can be retried.
const scripts = [];
let timeout;
const dependencyContext = {
  window: {}, Map, Promise, Error,
  setTimeout: callback => { timeout = callback; return 1; }, clearTimeout() {},
  document: {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { append: script => scripts.push(script) }
  }
};
vm.runInNewContext(read('js/dependencies.js'), dependencyContext);
const loader = dependencyContext.window.ToolDependencies;
const first = loader.load('xlsx');
const second = loader.load('xlsx');
assert.equal(scripts.length, 1);
dependencyContext.window.XLSX = { ready: true };
scripts[0].onload();
assert.deepEqual(await first, await second);
await loader.load('xlsx');
assert.equal(scripts.length, 1);
const failed = assert.rejects(loader.load('plotly'), /加载失败/);
scripts[1].onerror();
await failed;
assert.ok(scripts[1].removed);
const retry = loader.load('plotly');
assert.equal(scripts.length, 3);
dependencyContext.window.Plotly = {};
scripts[2].onload();
await retry;
const timedOut = assert.rejects(loader.load('zip'), /超时/);
timeout();
await timedOut;
assert.ok(scripts[3].removed);
await assert.rejects(loader.load('invalid'), /未知依赖/);
const uninitialized = assert.rejects(loader.load('mammoth'), /初始化失败/);
scripts[4].onload();
await uninitialized;

// Partial upload failures keep their source and do not re-upload successful images.
const images = [
  { src: 'data:image/png;base64,AAAA', dataset: {} },
  { src: 'data:image/png;base64,BBBB', dataset: {} },
  { src: 'https://files.catbox.moe/existing.png', dataset: {} }
];
const fields = Object.fromEntries(['cloud-upload-status', 'cloud-upload-list', 'btn-cloud-upload'].map(id => [id, {
  textContent: '', children: [], append(row) { this.children.push(row); }, replaceChildren() { this.children = []; }
}]));
let calls = 0;
const busy = [];
const uploadContext = {
  window: { wordDraft: { changed() {}, setBusy: value => busy.push(value) } },
  URL, AbortSignal, console,
  document: { querySelectorAll: () => images, getElementById: id => fields[id], createElement: () => ({ textContent: '' }) },
  fetch: async () => {
    calls++;
    return { ok: calls !== 2, status: calls === 2 ? 503 : 200,
      json: async () => calls === 2 ? { error: '暂时失败' } : { url: `https://files.catbox.moe/image${calls}.png` } };
  }
};
vm.runInNewContext(read('js/word-upload.js'), uploadContext);
await uploadContext.window.uploadAllToCloud();
assert.equal(calls, 2);
assert.equal(images[0].src, 'https://files.catbox.moe/image1.png');
assert.equal(images[1].src, 'data:image/png;base64,BBBB');
assert.match(fields['cloud-upload-status'].textContent, /成功 1 张，失败 1 张/);
assert.match(fields['cloud-upload-list'].children[1].textContent, /暂时失败.*可重试/);
assert.equal(uploadContext.window.WordUploads.busy, false);
assert.equal(fields['btn-cloud-upload'].disabled, false);
await uploadContext.window.uploadAllToCloud();
assert.equal(calls, 3);
assert.match(fields['cloud-upload-status'].textContent, /全部 3 张/);
assert.deepEqual(busy, [true, false, true, false]);
await uploadContext.window.uploadAllToCloud();
assert.equal(calls, 3);
for (const url of ['http://files.catbox.moe/a.png', 'https://catbox.moe.attacker.test/a.png', 'https://example.com/a.png']) {
  images[1].src = 'data:image/png;base64,BBBB';
  uploadContext.fetch = async () => ({ ok: true, json: async () => ({ url }) });
  await uploadContext.window.uploadAllToCloud();
  assert.equal(images[1].src, 'data:image/png;base64,BBBB');
  assert.match(fields['cloud-upload-status'].textContent, /失败 1 张/);
}
uploadContext.fetch = async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); };
await uploadContext.window.uploadAllToCloud();
assert.match(fields['cloud-upload-list'].children[0].textContent, /上传超时/);
assert.equal(fields['btn-cloud-upload'].disabled, false);

for (const page of ['community-dashboard.html', 'content-dashboard.html', 'page-traffic-dashboard.html', 'yiban-dashboard.html', 'youmeng.html']) {
  const html = read(page);
  assert.match(html, /src="js\/dependencies.js"/);
  assert.match(html, /await ToolDependencies.load\("xlsx", "plotly"\)/);
  assert.doesNotMatch(html, /<script[^>]+src="[^\"]*(plotly|xlsx|wordcloud)/i);
}
const word = read('word-to-html.html');
assert.match(word, /await ToolDependencies.load\('mammoth'\)/);
assert.match(word, /await displayResult\(result\)/);
assert.doesNotMatch(word, /(?:function|window\.)uploadAllToCloud\s*[=(]/);
assert.match(read('orc-log-parser.html'), /await import\('https:\/\/cdn\.jsdelivr\.net\/npm\/@duckdb/);
assert.doesNotMatch(read('pdf-compress.html'), /<script[^>]+src="[^\"]*(pdfjs|pdf-lib|jszip)/i);

console.log('PASS: lazy dependency deduplication, retry/timeout, partial Word uploads and lazy entry points');
