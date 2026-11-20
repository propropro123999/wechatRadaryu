import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'js/nav.js'), 'utf8'), context);
const tools = context.window.NAV_ITEMS;
assert.equal(tools.length, 11);
assert.equal(new Set(tools.map(tool => tool.href)).size, tools.length);
const counts = {};
for (const tool of tools) {
  assert.ok(existsSync(resolve(root, tool.href)), tool.href);
  assert.ok(tool.label && tool.desc && tool.formats, tool.href);
  assert.match(context.window.workspaceIcon(tool.icon), /<svg/);
  counts[tool.category] = (counts[tool.category] || 0) + 1;
  const page = readFileSync(resolve(root, tool.href), 'utf8');
  assert.match(page, /href="workspace.css"/, tool.href);
  assert.match(page, /src="js\/workspace.js"/, tool.href);
  assert.doesNotMatch(page, /\p{Extended_Pictographic}/u, tool.href);
  for (const match of page.matchAll(/data-icon="([a-z-]+)"/g)) {
    assert.ok(vm.runInNewContext('WORKSPACE_ICONS', context)[match[1]], match[1]);
  }
  assert.ok(page.indexOf('src="js/nav.js"') < page.indexOf('src="js/workspace.js"'), tool.href);
}
assert.deepEqual(counts, { analytics: 5, documents: 2, media: 3, developer: 1 });
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const styles = readFileSync(resolve(root, 'workspace.css'), 'utf8');
assert.match(styles, /--font-display: "Allo Display", var\(--font-sans\)/);
assert.doesNotMatch(styles.match(/--font-sans:[^;]+;/)[0], /Allo/);
assert.equal((styles.match(/font-family: var\(--font-display\)/g) || []).length, 1);
assert.equal(readFileSync(resolve(root, 'fonts/AlloVariableFriendly.woff2')).subarray(0, 4).toString(), 'wOF2');
assert.match(readFileSync(resolve(root, 'fonts/OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
for (const id of ['tool-grid', 'tool-search', 'catalog-empty', 'grid-view', 'list-view', 'mobile-menu', 'workspace-sidebar', 'sidebar-backdrop']) {
  assert.match(home, new RegExp('id="' + id + '"'));
}
assert.match(home, /aria-live="polite"/);
assert.match(home, /name="viewport"/);
const workspace = readFileSync(resolve(root, 'js/workspace.js'), 'utf8');
const hydrationSource = workspace.slice(workspace.indexOf('function hydrateIcons'), workspace.indexOf('  const sampleRows'));
const decoration = { dataset: { icon: 'copy' }, closest: () => null, hasChildNodes: () => false, innerHTML: '' };
const importedParagraph = { dataset: { icon: 'copy' }, closest: () => null, hasChildNodes: () => true, innerHTML: 'Article text' };
const importedDecoration = { dataset: { icon: 'copy' }, closest: () => ({}), hasChildNodes: () => false, innerHTML: '' };
vm.runInNewContext(hydrationSource + 'hydrateIcons();', {
  document: { querySelectorAll: () => [decoration, importedParagraph, importedDecoration] },
  workspaceIcon: context.window.workspaceIcon
});
assert.match(decoration.innerHTML, /<svg/);
assert.equal(importedParagraph.innerHTML, 'Article text');
assert.equal(importedDecoration.innerHTML, '');

const pdf = readFileSync(resolve(root, 'pdf-compress.html'), 'utf8');
const presetSource = pdf.slice(pdf.indexOf('function setStrength('), pdf.indexOf('// ===== 压缩处理'));
const buttons = ['fast', 'medium', 'maximum'].map(strength => ({
  dataset: { strength },
  classList: { toggle: (_name, selected) => { buttons.find(button => button.dataset.strength === strength).active = selected; } },
  setAttribute: (name, value) => { buttons.find(button => button.dataset.strength === strength)[name] = value; }
}));
const fields = {};
const presetContext = {
  document: { querySelectorAll: () => buttons, getElementById: id => (fields[id] ||= {}) },
  updateQualityValue() {}, updateMaxWidthValue() {}, localStorage: { setItem() {} }
};
vm.runInNewContext(presetSource + "setStrength('medium');", presetContext);
assert.equal(buttons.filter(button => button.active).length, 1);
assert.equal(buttons[1]['aria-pressed'], 'true');
assert.equal(fields['quality-slider'].value, 70);
assert.equal(fields['max-width'].value, 960);
const traffic = readFileSync(resolve(root, 'page-traffic-dashboard.html'), 'utf8');
const stayParser = traffic.slice(traffic.indexOf('function parseStayTimeToSeconds'), traffic.indexOf('function safeNumber'));
const stayContext = {};
vm.runInNewContext(stayParser, stayContext);
for (const [input, expected] of [['00:01:20', 80], ['01:20', 80], ['1:02:03', 3723], ['80秒', 80], ['80s', 80], [80, 80], ['', 0], ['0:99', 0], ['bad', 0]]) {
  assert.equal(stayContext.parseStayTimeToSeconds(input), expected, String(input));
}
const trafficScript = [...traffic.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('let globalRows'))[1];
const trafficFields = {};
const trafficContext = {
  document: {
    getElementById: id => (trafficFields[id] ||= { textContent: '', style: {} }),
    addEventListener() {}
  },
  window: {},
  FileReader: class { readAsArrayBuffer() { this.onload({ target: { result: new ArrayBuffer(0) } }); } },
  XLSX: { read: () => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }), utils: { sheet_to_json: () => [{ 受访页面: 'https://example.com', 浏览次数: 300, 独立访客: 200, 平均页面停留时间: '00:01:20' }] } },
  Plotly: { newPlot() {} },
  fetch: () => Promise.reject(new Error('Cross-origin title unavailable')),
  console: { warn() {}, error() {} }
};
vm.runInNewContext(trafficScript + 'handleFile({ target: { files: [{}] } });', trafficContext);
await new Promise(resolve => setImmediate(resolve));
assert.equal(trafficFields.error.textContent, '');
assert.equal(trafficFields.totalPV.textContent, 300);
assert.equal(trafficFields.avgStayTime.textContent, '80.00');
assert.ok(trafficFields.detailTable.innerHTML.includes('https://example.com'));
console.log('Workspace catalog, shared assets, category counts, and entry points passed.');
