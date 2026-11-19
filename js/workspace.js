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
    saveList('icviews-recent', [path, ...readList('icviews-recent').filter(item => item !== path)].slice(0, 11));
  }
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = workspaceIcon(element.dataset.icon); });
  }

  const path = location.pathname.split('/').pop().replace(/\.html$/, '') + '.html';
  const current = NAV_ITEMS.find(tool => tool.href === path);
  if (current) {
    document.body.classList.add('workspace-tool');
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
    if (path === 'article-formatter.html') {
      const intro = document.createElement('section');
      intro.className = 'tool-intro';
      intro.innerHTML = '<div class="eyebrow">CONTENT STUDIO</div><h1>让好内容，拥有好排版。</h1><p>粘贴文章或导入链接，一键规范格式，轻松复制到发布平台。</p>';
      nav.after(intro);
    }
    const logout = [...document.querySelectorAll('body > button')].find(button => button.textContent === '退出登录');
    if (logout) {
      logout.className = 'logout-button';
      nav.querySelector('.nav-actions').append(logout);
    }
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
  const grid = document.getElementById('tool-grid');
  if (!grid) return;
  const search = document.getElementById('tool-search');
  let category = 'all';
  let favorites = readList('icviews-favorites');
  let listView = false;
  try { listView = localStorage.getItem('icviews-view') === 'list'; } catch (_) {}

  function render() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const recent = readList('icviews-recent');
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
      saveList('icviews-favorites', favorites);
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
    try { localStorage.setItem('icviews-view', view); } catch (_) {}
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
