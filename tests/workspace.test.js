import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
  assert.match(page, /<title>[^<]* - Luyu的工具箱<\/title>/, tool.href);
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
assert.match(home, /<title>Luyu的工具箱<\/title>/);
assert.match(home, /aria-label="Luyu的工具箱 首页"/);
assert.match(home, /class="footer-brand">Luyu的工具箱<\/span>/);
assert.doesNotMatch(home, /href="https?:/);
for (const [, id] of home.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(home.includes('id="' + id + '"'), 'home anchor: ' + id);
}
const siteNavPage = readFileSync(resolve(root, 'site-nav.html'), 'utf8');
assert.match(siteNavPage, /<title>网址导航 - Luyu的工具箱<\/title>/);
assert.match(siteNavPage, /name="referrer" content="no-referrer"/);
assert.match(home, /class="sidebar-link sidebar-link-nav" href="site-nav.html"/);
assert.match(home, /class="nav-banner" href="site-nav.html"/);
for (const [, href] of home.matchAll(/class="wall-word" href="([^"]+)"/g)) {
  assert.ok(href === 'site-nav.html' || tools.some(tool => tool.href === href), 'home wall: ' + href);
}
assert.equal([...home.matchAll(/class="wall-word"/g)].length, tools.length + 1);
const siteNavContext = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'js/site-nav-data.js'), 'utf8'), siteNavContext);
const siteNav = siteNavContext.window.SITE_NAV;
assert.equal(siteNav.sites.length, 105);
assert.equal(siteNav.categories.length, 14);
assert.equal(new Set(siteNav.sites.map(site => site[2])).size, siteNav.sites.length);
assert.equal(new Set(siteNav.categories.map(category => category.id)).size, siteNav.categories.length);
for (const [category, name, url, desc] of siteNav.sites) {
  assert.ok(siteNav.categories[category] && name && desc, name);
  assert.match(new URL(url).protocol, /^https?:$/, url);
  assert.doesNotMatch(name + url + desc, /icviews|半导纵横/i);
}
for (const category of siteNav.categories) {
  assert.match(category.color, /^#[0-9a-f]{6}$/);
  assert.ok(siteNav.sites.some(site => siteNav.categories[site[0]] === category), category.id);
}
const iconContext = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'js/site-nav-icons.js'), 'utf8'), iconContext);
const siteIcons = iconContext.window.SITE_NAV_ICONS;
assert.equal(siteIcons.sites.length, siteNav.sites.length);
for (const key of siteIcons.sites) {
  assert.ok(key.startsWith('b:') ? siteIcons.brands[key.slice(2)] : siteIcons.lucide[key], key);
}
for (const id of ['all', 'favorites', 'recent', ...siteNav.categories.map(category => category.id)]) {
  assert.ok(siteIcons.lucide[siteIcons.categories[id]], id);
}
assert.ok(siteNavPage.indexOf('js/site-nav-icons.js') < siteNavPage.indexOf('js/site-nav.js"'));
assert.equal(new Set(tools.map(tool => tool.icon)).size, tools.length);
for (const page of [home, siteNavPage]) {
  assert.doesNotMatch(page, /class="(brand-mark|user-avatar|topbar-avatar)"[^>]*>[^<]/);
}
assert.match(readFileSync(resolve(root, 'THIRD-PARTY-NOTICES.md'), 'utf8'), /ISC License[\s\S]+CC0 1\.0/);
assert.equal([...home.matchAll(/class="wall-ghost" aria-hidden="true"/g)].length, tools.length + 1);
assert.equal([...home.matchAll(/class="wall-text"/g)].length, tools.length + 1);
assert.doesNotMatch(home + readFileSync(resolve(root, 'js/workspace.js'), 'utf8') + readFileSync(resolve(root, 'js/nav.js'), 'utf8'), /好工具|更从容|每一次创造|每一天|不将就|发现洞察/);
assert.match(readFileSync(resolve(root, 'favicon.svg'), 'utf8'), /^<svg /);
for (const page of readdirSync(root).filter(name => name.endsWith('.html'))) {
  const markup = readFileSync(resolve(root, page), 'utf8');
  assert.match(markup, /<link rel="icon" type="image\/svg\+xml" href="\/?favicon\.svg">/, page);
  assert.match(markup, /<script src="\/?js\/playful\.js" defer><\/script>/, page);
}
const lostPage = readFileSync(resolve(root, '404.html'), 'utf8');
assert.match(lostPage, /<meta name="robots" content="noindex">/);
for (const tool of tools) assert.ok(lostPage.includes(JSON.stringify([tool.href, tool.label])), tool.href);
assert.doesNotMatch(lostPage, /(?:href|src)="(?!\/|#)/);
assert.match(tools.find(tool => tool.href === 'image-compress.html').keywords, /体积/);
let navMarkup = '';
const navElement = { addEventListener() {}, querySelector() { return this; }, contains() { return false; } };
context.location = { pathname: '/community-dashboard' };
context.document = {
  getElementById: () => ({ set innerHTML(value) { navMarkup = value; }, querySelector: () => navElement }),
  addEventListener() {}
};
context.window.renderNav();
assert.match(navMarkup, /aria-label="Luyu的工具箱 首页"/);
assert.match(navMarkup, /<strong>Luyu的工具箱<\/strong>/);
assert.match(navMarkup, /community-dashboard.html" class="nav-app-item current"/);
assert.match(navMarkup, /href="site-nav.html" class="nav-app-item nav-app-extra"/);
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
const samplesSource = workspace.slice(workspace.indexOf('  const sampleRows'), workspace.indexOf('  const analyticsCopy'));
const samples = vm.runInNewContext(samplesSource + 'sampleRows');
for (const [path, row] of Object.entries(samples)) {
  assert.ok(tools.some(tool => tool.href === path), path);
  for (const value of Object.values(row)) {
    if (String(value).startsWith('https://')) assert.equal(new URL(value).hostname, 'example.com');
  }
}
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

const pdf = readFileSync(resolve(root, 'js/pdf-compress.js'), 'utf8');
const presetSource = pdf.slice(pdf.indexOf('function setStrength('), pdf.indexOf('function stopCompression('));
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
  ToolDependencies: { load: async () => {} },
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
const multiTraffic = readFileSync(resolve(root, 'youmeng.html'), 'utf8');
const classifier = multiTraffic.slice(multiTraffic.indexOf('function detectPageType'), multiTraffic.indexOf('// CSV 导出'));
const classifierContext = { URL };
vm.runInNewContext(classifier, classifierContext);
for (const [path, label] of [
  ['/', '网站首页'], ['/community/latest', '社区-首页'],
  ['/appCommunity/column', '社区-专栏集合页'], ['/community/writePost', '社区-创作发布页'],
  ['/appCommunity/postDetail/123', '社区-专栏内容页'], ['/community/other', '社区-其他'],
  ['/news/123', '资讯文章'], ['/news/recommend', '资讯推荐页'],
  ['/conference/2026', '会议活动'], ['/specialActivity/123', '活动页面'],
  ['/product/123', '产品页面'], ['/video/123', '视频内容'], ['/userCenter/123', '作者主页'],
  ['/other?next=/community/latest', '其他页面']
]) {
  assert.equal(classifierContext.detectPageType('https://example.com' + path), label, path);
}
assert.equal(classifierContext.detectPageType('https://conference.example.com/events'), '会议活动');
assert.equal(classifierContext.detectPageType(''), '其他');
assert.equal(classifierContext.detectPageType('http://['), '其他');
console.log('Workspace catalog, shared assets, category counts, and entry points passed.');
