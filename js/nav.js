const WORKSPACE_ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 3 5-8"/>',
  document: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14m0-10H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
  sparkles: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7zM20 2v4m-2-2h4"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
  compress: '<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 14z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>'
};

function workspaceIcon(name) {
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (WORKSPACE_ICONS[name] || WORKSPACE_ICONS.grid) + '</svg>';
}

const NAV_ITEMS = [
  { href: 'content-dashboard.html', icon: 'chart', label: '内容数据分析', category: 'analytics', desc: '读懂阅读、分享与完读表现，发现值得复用的好内容。', formats: 'CSV / XLSX', keywords: '公众号 微信 四象限 榜单', local: true },
  { href: 'bandao-ops-dashboard.html', icon: 'compass', label: '专栏 / 帖子分析', category: 'analytics', desc: '拆解发布频次、作者分层与高频词，掌握运营全貌。', formats: 'CSV / XLSX', keywords: '作者 内容 运营', local: true },
  { href: 'page-traffic-dashboard.html', icon: 'globe', label: '页面流量分析', category: 'analytics', desc: '从页面访问到流量漏斗，看清用户行为与转化路径。', formats: 'CSV / XLSX', keywords: '访问 页面 PV UV', local: true },
  { href: 'word-to-html.html', icon: 'document', label: 'Word 转 HTML', category: 'documents', desc: '保留文档图文结构，快速生成可发布的网页内容。', formats: 'DOCX → HTML', keywords: '文档 网页 转换 知乎 公众号', local: false },
  { href: 'image-compress.html', icon: 'compress', label: '图片压缩', category: 'media', desc: '批量减小图片体积，自定义画质与尺寸，轻巧不将就。', formats: 'JPG / PNG / WebP', keywords: '图片 批量 质量 大小', local: true },
  { href: 'article-formatter.html', icon: 'edit', label: '文章排版', category: 'documents', desc: '清理冗余样式，规范标点与空格，让每一段更易读。', formats: 'TEXT / HTML', keywords: '文本 清洗 编辑 格式化', local: false },
  { href: 'yiban-dashboard.html', icon: 'chart', label: '壹伴数据分析', category: 'analytics', desc: '把壹伴报表变成直观洞察，深度分析互动与转化。', formats: 'CSV / XLSX', keywords: '公众号 微信 报表', local: true },
  { href: 'youmeng.html', icon: 'layers', label: '友盟多表流量', category: 'analytics', desc: '合并多 Sheet 报表，对比流量趋势，告别重复汇总。', formats: 'XLSX / XLS', keywords: '多表 Sheet 合并 趋势', local: true },
  { href: 'pdf-compress.html', icon: 'document', label: 'PDF 压缩', category: 'media', desc: '按需平衡文件大小与清晰度，让文档分享更轻松。', formats: 'PDF', keywords: '文档 减小 大小 质量', local: true },
  { href: 'image-stitch.html', icon: 'image', label: '长图拼接', category: 'media', desc: '多张图片自由排序、无缝拼接，一张长图完整表达。', formats: 'JPG / PNG', keywords: '图片 合并 排序 长图', local: true },
  { href: 'orc-log-parser.html', icon: 'code', label: 'ORC 日志解析', category: 'developer', desc: '批量解析 ORC 数据，筛选、合并并导出 Excel 报表。', formats: 'ORC → XLSX', keywords: '日志 大数据 开发 Excel', local: false }
];

function renderNav(config = {}) {
  const { title = '工具', containerId = 'nav-container', showFileInput = false, fileAccept = '.csv,.xlsx,.xls', fileLabel = '选择文件', onFileChange = null } = config;
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = location.pathname.split('/').pop().replace(/\.html$/, '') + '.html';
  container.innerHTML = '<nav class="nav-bar workspace-tool-nav" aria-label="工具导航"><div class="tool-nav-leading"><a href="index.html" class="tool-brand" aria-label="ICviews Tools 首页"><span class="brand-mark">i<span>c</span></span><strong>ICviews <span>Tools</span></strong></a><span class="tool-nav-separator">/</span><span class="nav-title">' + title + '</span></div><div class="nav-actions">' +
    (showFileInput ? '<label class="nav-btn nav-btn-primary">' + workspaceIcon('upload') + '<span>' + fileLabel.replace(/^[^\p{L}\p{N}]+/u, '') + '</span><input type="file" id="nav-file-input" accept="' + fileAccept + '" class="nav-file-input"></label>' : '') +
    '<div class="nav-switcher"><button class="nav-switcher-btn" type="button" aria-label="切换工具" aria-expanded="false">' + workspaceIcon('grid') + '</button><div class="nav-switcher-menu" hidden>' +
    NAV_ITEMS.map(item => '<a href="' + item.href + '" class="nav-app-item' + (item.href === current ? ' current' : '') + '" ' + (item.href === current ? 'aria-current="page"' : '') + '>' + workspaceIcon(item.icon) + '<span>' + item.label + '</span></a>').join('') +
    '</div></div><a href="index.html" class="nav-btn nav-btn-secondary tool-home-link">全部工具 ' + workspaceIcon('arrow') + '</a></div></nav>';
  const switcher = container.querySelector('.nav-switcher');
  const toggle = switcher.querySelector('button');
  const menu = switcher.querySelector('.nav-switcher-menu');
  function close() { toggle.setAttribute('aria-expanded', 'false'); menu.hidden = true; }
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); menu.hidden = !open; });
  document.addEventListener('click', event => { if (!switcher.contains(event.target)) close(); });
  switcher.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); toggle.focus(); } });
  if (showFileInput && onFileChange) container.querySelector('#nav-file-input').addEventListener('change', onFileChange);
}

window.renderNav = renderNav;
window.NAV_ITEMS = NAV_ITEMS;
window.workspaceIcon = workspaceIcon;
