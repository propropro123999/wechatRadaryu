// 图标路径来自 Lucide（ISC），授权见 THIRD-PARTY-NOTICES.md；brand 是本站自绘的标志。
const WORKSPACE_ICONS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  chart: '<rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor" fill-opacity=".18" stroke="none"/><rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" fill-opacity=".28" stroke="none"/><rect x="17" y="4" width="4" height="17" rx="1" fill="currentColor" fill-opacity=".18" stroke="none"/><path d="M4 21v-7a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v7"/><path d="M11 21V10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v11"/><path d="M18 21V5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v16"/><path d="M2 21h20"/>',
  document: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="currentColor" fill-opacity=".14"/><path d="m9 12 2 2 4-4"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  compass: '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/>',
  compress: '<path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2M9 15l-6 6"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/>',
  edit: '<path d="M4 5a2 2 0 0 1 2-2h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" fill="currentColor" fill-opacity=".16" stroke="none"/><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/><path d="m14.5 5.5 4 4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  settings: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  bolt: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  community: '<circle cx="9.5" cy="8" r="4" fill="currentColor" fill-opacity=".22"/><path d="M2.5 20a7 7 0 0 1 14 0Z" fill="currentColor" fill-opacity=".16" stroke="none"/><path d="M16.5 20a7 7 0 0 0-14 0"/><path d="M21.5 19.5c0-2.9-1.7-5.5-3.8-6.6a4 4 0 0 0-.6-7.6"/>',
  traffic: '<path d="M3 17 8.5 11.5 13 15 21 6.5V20H3Z" fill="currentColor" fill-opacity=".18" stroke="none"/><path d="M3 17 8.5 11.5 13 15 21 6.5"/><path d="M16 6.5h5v5"/><path d="M3 20h18"/>',
  word: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" fill="currentColor" fill-opacity=".16"/><path d="M14 2v6h6"/><path d="m8 12 1.4 5.5L12 13l2.6 4.5L16 12"/>',
  'image-down': '<path d="M13 19H5.5A2.5 2.5 0 0 1 3 16.5v-11A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5V12" fill="currentColor" fill-opacity=".16"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" stroke="none"/><path d="m4 16.2 4.3-4.3a1.5 1.5 0 0 1 2.1 0l2.6 2.6"/><path d="M18 14v7"/><path d="m15.5 18.5 2.5 2.5 2.5-2.5"/>',
  sources: '<path d="M21 12A9 9 0 1 1 12 3v9Z" fill="currentColor" fill-opacity=".16"/><path d="M14 2.2A9 9 0 0 1 21.8 10H14Z" fill="currentColor" fill-opacity=".32"/><path d="M21 12A9 9 0 1 1 12 3v9Z"/><path d="M14 2.2A9 9 0 0 1 21.8 10H14Z"/>',
  sheets: '<rect x="3" y="3" width="18" height="6" rx="2" fill="currentColor" fill-opacity=".22" stroke="none"/><rect width="18" height="18" x="3" y="3" rx="2.5"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 9v12"/><path d="M15 9v12"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" fill="currentColor" fill-opacity=".16"/><path d="M14 2v6h6"/><rect x="7" y="13" width="10" height="5" rx="1.5" fill="currentColor" fill-opacity=".24"/><path d="M10 15.5h4"/>',
  stitch: '<rect x="5" y="3" width="14" height="6.5" rx="2" fill="currentColor" fill-opacity=".18"/><rect x="5" y="14.5" width="14" height="6.5" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M9 9.5v5"/><path d="M15 9.5v5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" fill-opacity=".16"/><path d="M3 9h18"/><path d="m7.5 13 2.5 2-2.5 2"/><path d="M12.5 17h4"/>',
  brand: '<circle cx="8" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M13 10.6q2.2-2.8 4.4 0"/><path d="M8.4 15.2q3.6 2.9 7.2 0"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'
};

function workspaceIcon(name) {
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (WORKSPACE_ICONS[name] || WORKSPACE_ICONS.grid) + '</svg>';
}

const NAV_ITEMS = [
  { href: 'content-dashboard.html', icon: 'chart', color: '#0a84ff', label: '内容数据分析', category: 'analytics', desc: '看阅读、分享和完读，哪篇能打一目了然。', formats: 'CSV / XLSX', keywords: '公众号 微信 四象限 榜单', local: true },
  { href: 'community-dashboard.html', icon: 'community', color: '#00a6cf', label: '专栏 / 帖子分析', category: 'analytics', desc: '发帖频次、作者分层、高频词，一张表摸清家底。', formats: 'CSV / XLSX', keywords: '作者 内容 运营', local: true },
  { href: 'page-traffic-dashboard.html', icon: 'traffic', color: '#ff2d6f', label: '页面流量分析', category: 'analytics', desc: '谁来了、看了啥、在哪走的，漏斗里见分晓。', formats: 'CSV / XLSX', keywords: '访问 页面 PV UV', local: true },
  { href: 'word-to-html.html', icon: 'word', color: '#ef4444', label: 'Word 转 HTML', category: 'documents', desc: 'Word 文档原样搬上网页，图文一个不落。', formats: 'DOCX → HTML', keywords: '文档 网页 转换 知乎 公众号', local: false },
  { href: 'image-compress.html', icon: 'image-down', color: '#6b5cff', label: '图片压缩', category: 'media', desc: '给图片批量瘦身，画质和尺寸你说了算。', formats: 'JPG / PNG / WebP', keywords: '图片 批量 质量 大小 体积 压缩', local: true },
  { href: 'article-formatter.html', icon: 'edit', color: '#00a88f', label: '文章排版', category: 'documents', desc: '清掉乱七八糟的样式，标点空格各归各位。', formats: 'TEXT / HTML', keywords: '文本 清洗 编辑 格式化', local: false },
  { href: 'yiban-dashboard.html', icon: 'sources', color: '#d97706', label: '阅读来源分析', category: 'analytics', desc: '读者从哪儿来的？按来源拆开看互动和转化。', formats: 'CSV / XLSX', keywords: '公众号 微信 报表', local: true },
  { href: 'youmeng.html', icon: 'sheets', color: '#16a34a', label: '多表流量分析', category: 'analytics', desc: '多个 Sheet 合成一张，不用再手动复制粘贴。', formats: 'XLSX / XLS', keywords: '多表 Sheet 合并 趋势', local: true },
  { href: 'pdf-compress.html', icon: 'pdf', color: '#f97316', label: 'PDF 压缩', category: 'media', desc: '给 PDF 减减肥，清晰度留多少你定。', formats: 'PDF', keywords: '文档 减小 大小 质量', local: true },
  { href: 'image-stitch.html', icon: 'stitch', color: '#ca8a04', label: '长图拼接', category: 'media', desc: '多张图排好队，拼成一张长图。', formats: 'JPG / PNG', keywords: '图片 合并 排序 长图', local: true },
  { href: 'orc-log-parser.html', icon: 'terminal', color: '#c026d3', label: 'ORC 日志解析', category: 'developer', desc: '批量解析 ORC 数据，筛选、合并并导出 Excel 报表。', formats: 'ORC → XLSX', keywords: '日志 大数据 开发 Excel', local: false }
];

function renderNav(config = {}) {
  const { title = '工具', containerId = 'nav-container', showFileInput = false, fileAccept = '.csv,.xlsx,.xls', fileLabel = '选择文件', onFileChange = null } = config;
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = location.pathname.split('/').pop().replace(/\.html$/, '') + '.html';
  container.innerHTML = '<nav class="nav-bar workspace-tool-nav" aria-label="工具导航"><div class="tool-nav-leading"><a href="index.html" class="tool-brand" aria-label="Luyu的工具箱 首页"><span class="brand-mark" aria-hidden="true">' + workspaceIcon('brand') + '</span><strong>Luyu的工具箱</strong></a><span class="tool-nav-separator">/</span><span class="nav-title">' + title + '</span></div><div class="nav-actions">' +
    (showFileInput ? '<label class="nav-btn nav-btn-primary">' + workspaceIcon('upload') + '<span>' + fileLabel.replace(/^[^\p{L}\p{N}]+/u, '') + '</span><input type="file" id="nav-file-input" accept="' + fileAccept + '" class="nav-file-input"></label>' : '') +
    '<div class="nav-switcher"><button class="nav-switcher-btn" type="button" aria-label="切换工具" aria-expanded="false">' + workspaceIcon('grid') + '</button><div class="nav-switcher-menu" hidden>' +
    NAV_ITEMS.map(item => '<a href="' + item.href + '" class="nav-app-item' + (item.href === current ? ' current' : '') + '" style="--tool-c:' + item.color + '" ' + (item.href === current ? 'aria-current="page"' : '') + '><span class="nav-app-icon" aria-hidden="true">' + workspaceIcon(item.icon) + '</span><span>' + item.label + '</span></a>').join('') +
    '<a href="site-nav.html" class="nav-app-item nav-app-extra" style="--tool-c:#00b89c"><span class="nav-app-icon" aria-hidden="true">' + workspaceIcon('globe') + '</span><span>网址导航</span></a>' +
    '</div></div><a href="index.html" class="nav-btn nav-btn-secondary tool-home-link">' + workspaceIcon('home') + '<span>返回首页</span></a></div></nav>';
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
