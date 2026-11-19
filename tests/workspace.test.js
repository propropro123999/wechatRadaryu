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
  assert.ok(page.indexOf('src="js/nav.js"') < page.indexOf('src="js/workspace.js"'), tool.href);
}
assert.deepEqual(counts, { analytics: 5, documents: 2, media: 3, developer: 1 });
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const id of ['tool-grid', 'tool-search', 'catalog-empty', 'grid-view', 'list-view', 'mobile-menu', 'workspace-sidebar', 'sidebar-backdrop']) {
  assert.match(home, new RegExp('id="' + id + '"'));
}
assert.match(home, /aria-live="polite"/);
assert.match(home, /name="viewport"/);
console.log('Workspace catalog, shared assets, category counts, and entry points passed.');
