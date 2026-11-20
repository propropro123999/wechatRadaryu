(function () {
  'use strict';
  const categoryNames = { all: '全部工具', analytics: '数据洞察', documents: '内容与文档', media: '图片与 PDF', developer: '开发辅助', favorites: '我的收藏', recent: '最近使用' };
  const knownPaths = new Set(NAV_ITEMS.map(tool => tool.href));
  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? [...new Set(value.filter(item => knownPaths.has(item)))] : [];
    } catch (_) { return []; }
  }
  function saveList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) { /* Browsing without storage is supported. */ }
  }
  function markVisited(path) {
    if (!knownPaths.has(path)) return;
    saveList('luyu-toolbox-recent', [path, ...readList('luyu-toolbox-recent').filter(item => item !== path)].slice(0, 11));
  }
  function hydrateIcons(root = document) {
    const icons = [...root.querySelectorAll('[data-icon]')];
    if (root.matches?.('[data-icon]')) icons.unshift(root);
    icons.forEach(element => {
      if (!element.closest('[contenteditable]') && !element.hasChildNodes()) {
        element.innerHTML = workspaceIcon(element.dataset.icon);
      }
    });
  }

  const sampleRows = {
    'content-dashboard.html': { 内容标题: '示例：一次内容复盘', 发表时间: '2026-01-15', 总阅读人数: 1200, 总阅读次数: 1800, 总分享次数: 86, 阅读完成率: 62, 送达人数: 5000 },
    'community-dashboard.html': { 动态ID: 'demo-001', 动态标题: '示例：行业观察', 发布者: '内容团队', 点赞数: 28, 评论数: 9, 创建时间: '2026-01-15' },
    'page-traffic-dashboard.html': { 受访页面: 'https://example.com/news/recommend', 浏览次数: 1800, 独立访客: 1200, IP: 1000, 人均浏览页数: 1.5, 平均页面停留时间: '00:01:20' },
    'yiban-dashboard.html': { 标题: '示例：内容运营周报', 日期: '2026-01-15', 阅读人数: 1200, 阅读量: 1800, 分享量: 86, 点赞数: 36, 朋友圈: 180 },
    'youmeng.html': { 受访页面: 'https://example.com/news/recommend', 浏览次数: 1800, 独立访客: 1200, IP: 1000, 人均浏览页数: 1.5, 平均页面停留时间: '00:01:20' }
  };
  const analyticsCopy = {
    'content-dashboard.html': ['看清阅读、分享与完读表现。', '导入公众号后台的内容明细，对比阅读、分享与完读率，找到真正值得复用的选题。'],
    'community-dashboard.html': ['发现专栏与帖子的增长线索。', '导入帖子报表，串联发布趋势、互动表现与作者贡献，定位高潜内容与活跃作者。'],
    'page-traffic-dashboard.html': ['找到真正带来访问的页面。', '导入页面流量明细，汇总 PV、UV 与停留时长，识别最受关注的页面。'],
    'yiban-dashboard.html': ['拆解公众号内容的阅读来源。', '导入文章数据，比较阅读、分享与来源分布，找到内容传播的关键渠道。'],
    'youmeng.html': ['把多张流量报表，汇成全局。', '导入包含多个工作表的流量报表，合并季度数据、识别页面类型，查看整体访问表现与榜单。']
  };
  function setupAnalytics(tool) {
    const container = document.querySelector('.container');
    const firstResult = document.getElementById('summaryCards') || document.getElementById('section-overview');
    if (!container || !firstResult) return;
    document.body.classList.add('workspace-awaiting-data');
    const results = document.createElement('section');
    results.className = 'workspace-results';
    results.hidden = true;
    firstResult.before(results);
    let child = results.nextElementSibling;
    while (child) {
      const next = child.nextElementSibling;
      if (child.tagName !== 'SCRIPT') results.append(child);
      child = next;
    }
    const empty = document.createElement('section');
    empty.className = 'workspace-upload';
    empty.innerHTML = '<div class="upload-empty-layout"><div><span class="upload-empty-icon">' + workspaceIcon(tool.icon) + '</span><h2>从一份报表，开始发现洞察。</h2><p>导入你的 ' + tool.formats + ' 数据，自动整理关键指标、趋势与内容表现。无需配置，也不用手动计算。</p><div class="upload-empty-actions"><button type="button" class="btn btn-primary" data-upload-action>' + workspaceIcon('upload') + '选择数据文件</button><button type="button" class="btn btn-secondary" data-sample-action>' + workspaceIcon('download') + '下载示例表格</button></div><div class="upload-privacy">' + workspaceIcon('shield') + '报表仅在当前浏览器处理，不会上传。</div></div><div class="upload-steps"><div class="upload-step"><span>01</span><div><strong>导入原始报表</strong><p>保留第一行表头，一次选择一个文件。</p></div></div><div class="upload-step"><span>02</span><div><strong>自动识别与整理</strong><p>匹配字段并汇总关键数据。</p></div></div><div class="upload-step"><span>03</span><div><strong>查看图表与洞察</strong><p>对比表现，找到下一步优化方向。</p></div></div></div></div><details class="upload-guide"><summary>查看导入指南与示例字段</summary><p>表头请与下方字段一致；可先下载示例表格了解结构，再替换为你的真实数据。</p><div class="upload-columns">' + Object.keys(sampleRows[tool.href]).map(column => '<span>' + column + '</span>').join('') + '</div></details>';
    results.before(empty);
    const [headline, description] = analyticsCopy[tool.href];
    empty.querySelector('h2').textContent = headline;
    empty.querySelector('.upload-empty-layout p').textContent = description;
    const existingGuide = document.getElementById('usageBody');
    if (existingGuide) {
      empty.querySelector('.upload-guide').append(existingGuide);
      document.getElementById('usageCard').hidden = true;
    }
    empty.querySelector('[data-upload-action]').addEventListener('click', () => document.getElementById('nav-file-input')?.click());
    empty.querySelector('[data-sample-action]').addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        const error = document.getElementById('error') || document.getElementById('status');
        if (error) error.textContent = '表格组件未加载，请检查网络后刷新页面。';
        return;
      }
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([sampleRows[tool.href]]), '示例数据');
      XLSX.writeFile(book, tool.label + '-示例.xlsx');
    });
    window.workspaceDataReady = () => {
      results.hidden = false;
      empty.hidden = true;
      document.body.classList.remove('workspace-awaiting-data');
    };
  }

  const path = location.pathname.split('/').pop().replace(/\.html$/, '') + '.html';
  const current = NAV_ITEMS.find(tool => tool.href === path);
  if (current) {
    document.body.classList.add('workspace-tool');
    document.body.dataset.tool = current.href.replace('.html', '');
    document.body.dataset.toolCategory = current.category;
    markVisited(current.href);
    let nav = document.getElementById('nav-container');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'nav-container';
      const legacyNav = document.querySelector('.gem-navbar');
      if (legacyNav) legacyNav.replaceWith(nav);
      else document.body.prepend(nav);
      renderNav({ title: current.label });
    }
    document.querySelectorAll('h1').forEach(heading => {
      const section = heading.closest('header') || heading.parentElement;
      if (section.matches('.mb-6') || path === 'orc-log-parser.html' || path === 'word-to-html.html') section.classList.add('legacy-tool-heading');
      else heading.classList.add('legacy-tool-heading');
    });
    const intro = document.createElement('section');
    intro.className = 'tool-intro';
    const categoryLabels = { analytics: 'DATA INSIGHTS', documents: 'CONTENT STUDIO', media: 'MEDIA WORKSPACE', developer: 'DEVELOPER TOOLS' };
    intro.innerHTML = '<div><div class="eyebrow">' + categoryLabels[current.category] + '</div><h1>' + current.label + '</h1><p>' + current.desc + '</p></div><span class="tool-format-badge">' + workspaceIcon(current.local ? 'shield' : current.icon) + current.formats + '</span>';
    nav.after(intro);
    if (sampleRows[current.href]) setupAnalytics(current);
    document.querySelectorAll('.dropzone-icon, .upload-icon').forEach(icon => { icon.innerHTML = workspaceIcon('upload'); });
    document.querySelectorAll('.dropzone, .drop-zone').forEach(zone => {
      const decoration = zone.querySelector(':scope > div[style*="font-size:48px"], :scope > div[style*="font-size: 48px"]');
      if (decoration) { decoration.innerHTML = workspaceIcon('upload'); decoration.style.fontSize = '32px'; decoration.style.color = '#7a997d'; }
    });
    const cardTitleSelector = 'h1, h2, h3, .intro-title, .card-title, .dropzone-text';
    document.querySelectorAll(cardTitleSelector).forEach(element => {
      element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = node.textContent.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
      });
    });
  }

  hydrateIcons();
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) hydrateIcons(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });
  const grid = document.getElementById('tool-grid');
  if (!grid) return;
  const search = document.getElementById('tool-search');
  let category = 'all';
  let favorites = readList('luyu-toolbox-favorites');
  let listView = false;
  try { listView = localStorage.getItem('luyu-toolbox-view') === 'list'; } catch (_) {}

  function render() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const recent = readList('luyu-toolbox-recent');
    let tools = NAV_ITEMS.filter(tool => {
      const inCategory = category === 'all' || tool.category === category || (category === 'favorites' && favorites.includes(tool.href)) || (category === 'recent' && recent.includes(tool.href));
      const haystack = [tool.label, tool.desc, tool.formats, tool.keywords, categoryNames[tool.category]].join(' ').toLocaleLowerCase();
      return inCategory && terms.every(term => haystack.includes(term));
    });
    if (category === 'recent') tools.sort((a, b) => recent.indexOf(a.href) - recent.indexOf(b.href));
    grid.innerHTML = tools.map(tool => {
      const favorite = favorites.includes(tool.href);
      return '<article class="catalog-card" data-category="' + tool.category + '"><a class="catalog-card-link" href="' + tool.href + '" data-tool-visit="' + tool.href + '"><div class="catalog-card-top"><span class="catalog-icon">' + workspaceIcon(tool.icon) + '</span><span class="catalog-card-category">' + categoryNames[tool.category] + '</span></div><h3>' + tool.label + '</h3><p>' + tool.desc + '</p><div class="catalog-card-bottom"><span>' + tool.formats + '</span><span class="card-open">打开工具 ' + workspaceIcon('arrow') + '</span></div></a><button class="favorite-button" data-favorite="' + tool.href + '" aria-label="' + (favorite ? '取消收藏' : '收藏') + tool.label + '" aria-pressed="' + favorite + '" title="' + (favorite ? '取消收藏' : '收藏工具') + '">' + workspaceIcon('star') + '</button></article>';
    }).join('');
    document.getElementById('favorite-count').textContent = favorites.length;
    document.getElementById('results-count').textContent = tools.length;
    document.getElementById('tools-title').firstChild.textContent = categoryNames[category] + ' ';
    document.getElementById('breadcrumb-current').textContent = categoryNames[category];
    document.getElementById('tools-description').textContent = category === 'favorites' ? '顺手的好工具，收藏后随时找到。' : category === 'recent' ? '接着上次的灵感，继续高效工作。' : '为日常工作精选，即开即用。';
    document.querySelectorAll('[data-category]:is(button)').forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('catalog-empty').hidden = tools.length !== 0;
    document.getElementById('empty-title').textContent = terms.length ? '没有找到匹配的工具' : category === 'favorites' ? '收藏你的第一个好工具' : '这里还没有使用记录';
    document.getElementById('empty-description').textContent = terms.length ? '换个关键词，或查看全部工具。' : category === 'favorites' ? '点击工具卡片右上角的星标，就能在这里快速找到。' : '打开一个工具后，就能在这里继续上次的工作。';
    document.getElementById('search-announcement').textContent = '找到 ' + tools.length + ' 个工具';
    grid.classList.toggle('list-view', listView);
    ['grid', 'list'].forEach(view => {
      const active = view === (listView ? 'list' : 'grid');
      const button = document.getElementById(view + '-view');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  const mobileToggle = document.getElementById('mobile-menu');
  const sidebar = document.getElementById('workspace-sidebar');
  function setMenu(open) {
    document.body.classList.toggle('sidebar-open', open);
    document.getElementById('sidebar-backdrop').hidden = !open;
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? '关闭导航' : '展开导航');
    sidebar.inert = !open && matchMedia('(max-width: 760px)').matches;
    if (open) sidebar.querySelector('.sidebar-link.active').focus();
  }
  mobileToggle.addEventListener('click', () => setMenu(!document.body.classList.contains('sidebar-open')));
  document.getElementById('sidebar-backdrop').addEventListener('click', () => { setMenu(false); mobileToggle.focus(); });
  const mobileQuery = matchMedia('(max-width: 760px)');
  mobileQuery.addEventListener('change', () => setMenu(false));
  setMenu(false);
  document.querySelectorAll('button[data-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    render();
    setMenu(false);
    if (mobileQuery.matches && sidebar.contains(button)) mobileToggle.focus();
  }));
  document.addEventListener('click', event => {
    const favoriteButton = event.target.closest('[data-favorite]');
    if (favoriteButton) {
      const href = favoriteButton.dataset.favorite;
      const index = favorites.indexOf(href);
      if (index === -1) favorites.push(href);
      else favorites.splice(index, 1);
      saveList('luyu-toolbox-favorites', favorites);
      render();
      const next = grid.querySelector('[data-favorite="' + href + '"]');
      if (next) next.focus();
      else document.querySelector('.sidebar-link.active').focus();
    }
    const tool = event.target.closest('[data-tool-visit]');
    if (tool) markVisited(tool.dataset.toolVisit);
  });
  search.addEventListener('input', render);
  document.getElementById('reset-filters').addEventListener('click', () => { search.value = ''; category = 'all'; render(); search.focus(); });
  ['grid', 'list'].forEach(view => document.getElementById(view + '-view').addEventListener('click', () => {
    listView = view === 'list';
    try { localStorage.setItem('luyu-toolbox-view', view); } catch (_) {}
    render();
  }));
  document.getElementById('search-shortcut').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); search.select(); }
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) { setMenu(false); mobileToggle.focus(); }
    if (event.key === 'Tab' && document.body.classList.contains('sidebar-open')) {
      const focusable = [...sidebar.querySelectorAll('button, a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  render();
})();
