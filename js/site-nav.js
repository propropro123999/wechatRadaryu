(function () {
  'use strict';
  const { categories, sites } = window.SITE_NAV;
  const weights = [300, 800, 500, 200, 900, 400, 700, 100, 600, 900, 300, 800, 200, 700];
  const glyphs = [
    '<path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z" fill="currentColor"/>',
    '<path d="M12 21s-8.5-5.2-8.5-11.3A4.7 4.7 0 0 1 12 6.9a4.7 4.7 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21z" fill="currentColor"/>',
    '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    '<path d="M4 12.5l5.5 5.5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M9.5 3.5l-2 17M16.5 3.5l-2 17M4 8.5h17M3 15.5h17" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    '<path d="M12 3l10 18H2z" fill="currentColor"/>'
  ];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const hostOf = url => new URL(url).hostname.replace(/^www\./, '');
  const items = sites.map(([cat, name, url, desc], index) => ({ index, cat: categories[cat], name, url, desc, host: hostOf(url), haystack: [name, desc, url, categories[cat].name, categories[cat].word].join(' ').toLocaleLowerCase() }));
  const known = new Set(items.map(item => item.url));
  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? [...new Set(value.filter(url => known.has(url)))] : [];
    } catch (_) { return []; }
  }
  function saveList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) { /* Works without storage. */ }
  }
  let favorites = readList('luyu-toolbox-site-favorites');
  let category = 'all';
  const wall = document.getElementById('sn-wall');
  const chips = document.getElementById('sn-chips');
  const results = document.getElementById('sn-results');
  const search = document.getElementById('sn-search');
  const status = document.getElementById('sn-status');
  const empty = document.getElementById('sn-empty');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const counts = categories.map((_, index) => sites.filter(site => site[0] === index).length);

  wall.innerHTML = categories.map((cat, index) =>
    '<button type="button" class="sn-word" data-cat="' + cat.id + '" data-name="' + escapeHtml(cat.name) + ' · ' + counts[index] + '" aria-label="' + escapeHtml(cat.name) + '，' + counts[index] + ' 个站点" aria-pressed="false" style="--c:' + cat.color + ';--w:' + weights[index] + ';--wh:' + (weights[index] >= 700 ? 200 : 900) + '">' + cat.word + '<sup>' + counts[index] + '</sup></button>' +
    (index < categories.length - 1 ? '<svg class="sn-glyph" viewBox="0 0 24 24" aria-hidden="true" style="--c:' + categories[(index + 5) % categories.length].color + '">' + glyphs[index % glyphs.length] + '</svg>' : '')
  ).join('');
  function chip(id, label, count, color) {
    return '<button type="button" class="sn-chip" data-cat="' + id + '" aria-pressed="false"' + (color ? ' style="--c:' + color + '"' : '') + '>' + escapeHtml(label) + (count === '' ? '' : ' <b>' + count + '</b>') + '</button>';
  }
  chips.innerHTML = chip('all', '全部', sites.length) + chip('favorites', '收藏', 0) + chip('recent', '最近访问', '') +
    categories.map((cat, index) => chip(cat.id, cat.name.split(/[ 、/]/)[0], counts[index], cat.color)).join('');
  const favoriteCount = chips.querySelector('[data-cat="favorites"] b');

  function highlight(value, terms) {
    if (!terms.length) return escapeHtml(value);
    const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let html = '';
    let last = 0;
    for (const match of value.matchAll(pattern)) {
      html += escapeHtml(value.slice(last, match.index)) + '<mark>' + escapeHtml(match[0]) + '</mark>';
      last = match.index + match[0].length;
    }
    return html + escapeHtml(value.slice(last));
  }
  function card(item, order, terms) {
    const favorite = favorites.includes(item.url);
    return '<article class="sn-card" data-cat="' + item.cat.id + '" style="--c:' + item.cat.color + ';--i:' + order + '">' +
      '<a class="sn-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer" data-site="' + item.index + '">' +
      '<span class="sn-avatar" aria-hidden="true">' + escapeHtml([...item.name][0]) + '</span>' +
      '<span class="sn-name">' + highlight(item.name, terms) + '</span><span class="sn-host">' + highlight(item.host, terms) + '</span>' +
      '<span class="sn-desc">' + highlight(item.desc, terms) + '</span>' +
      '<svg class="sn-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>' +
      '<button type="button" class="sn-fav" data-fav="' + item.index + '" aria-pressed="' + favorite + '" aria-label="' + (favorite ? '取消收藏 ' : '收藏 ') + escapeHtml(item.name) + '"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2l2.7 5.7 6.1.8-4.5 4.3 1.2 6.2L12 17.2l-5.5 3 1.2-6.2L3.2 9.7l6.1-.800z"/></svg></button></article>';
  }
  function visible() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const recent = readList('luyu-toolbox-site-recent');
    let list = items.filter(item =>
      (category === 'all' || item.cat.id === category || (category === 'favorites' && favorites.includes(item.url)) || (category === 'recent' && recent.includes(item.url))) &&
      terms.every(term => item.haystack.includes(term)));
    if (category === 'recent') list = list.sort((a, b) => recent.indexOf(a.url) - recent.indexOf(b.url));
    return { list, terms };
  }
  function render() {
    const { list, terms } = visible();
    const grouped = category === 'all' && !terms.length;
    let order = 0;
    results.innerHTML = grouped
      ? categories.map((cat, index) => '<section class="sn-section" id="cat-' + cat.id + '" style="--c:' + cat.color + '"><div class="sn-section-head"><span class="sn-section-word" aria-hidden="true">' + cat.word + '</span><h2>' + escapeHtml(cat.name) + '</h2><span>' + counts[index] + ' 个站点</span></div><div class="sn-grid">' +
          list.filter(item => item.cat === cat).map(item => card(item, order++, terms)).join('') + '</div></section>').join('')
      : '<section class="sn-section"><div class="sn-grid">' + list.map(item => card(item, order++, terms)).join('') + '</div></section>';
    const label = category === 'all' ? '' : category === 'favorites' ? '收藏' : category === 'recent' ? '最近访问' : categories.find(cat => cat.id === category).name;
    status.innerHTML = grouped ? '' : (label ? '<mark>' + escapeHtml(label) + '</mark> · ' : '') + (terms.length ? '“' + escapeHtml(search.value.trim()) + '” · ' : '') + '找到 <mark>' + list.length + '</mark> 个站点';
    empty.hidden = list.length !== 0;
    empty.querySelector('strong').textContent = terms.length ? '没有匹配的站点' : category === 'favorites' ? '还没有收藏' : '还没有访问记录';
    empty.querySelector('p').textContent = terms.length ? '换个关键词，或回到全部分类。' : category === 'favorites' ? '点站点卡片右上角的星标，或聚焦后按 F。' : '打开过的站点会出现在这里。';
    favoriteCount.textContent = favorites.length;
    wall.classList.toggle('filtered', categories.some(cat => cat.id === category));
    document.querySelectorAll('[data-cat]:is(button)').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cat === category)));
  }
  function setCategory(next, scroll) {
    category = next === category && next !== 'all' ? 'all' : next;
    render();
    chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    if (scroll) document.getElementById('sn-toolbar').scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
  function toggleFavorite(button) {
    const item = items[Number(button.dataset.fav)];
    favorites = readList('luyu-toolbox-site-favorites');
    const active = !favorites.includes(item.url);
    favorites = active ? [item.url, ...favorites] : favorites.filter(url => url !== item.url);
    saveList('luyu-toolbox-site-favorites', favorites);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', (active ? '取消收藏 ' : '收藏 ') + item.name);
    button.classList.remove('pop');
    void button.offsetWidth;
    button.classList.add('pop');
    favoriteCount.textContent = favorites.length;
    if (category === 'favorites' && !active) render();
  }
  function remember(link) {
    if (!link) return;
    const url = items[Number(link.dataset.site)].url;
    saveList('luyu-toolbox-site-recent', [url, ...readList('luyu-toolbox-site-recent').filter(item => item !== url)].slice(0, 12));
  }
  function cards() { return [...results.querySelectorAll('.sn-link')]; }
  function move(from, key) {
    const all = cards();
    const index = all.indexOf(from);
    if (key === 'ArrowLeft' || key === 'ArrowRight') return all[index + (key === 'ArrowRight' ? 1 : -1)];
    const box = from.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    let best = null;
    let bestScore = Infinity;
    for (const candidate of all) {
      const rect = candidate.getBoundingClientRect();
      const gap = key === 'ArrowDown' ? rect.top - box.bottom : box.top - rect.bottom;
      if (gap < -1) continue;
      const score = gap * 4 + Math.abs(rect.left + rect.width / 2 - centre);
      if (score < bestScore) { bestScore = score; best = candidate; }
    }
    return best;
  }

  document.addEventListener('click', event => {
    const filter = event.target.closest('button[data-cat]');
    if (filter) return setCategory(filter.dataset.cat, filter.classList.contains('sn-word'));
    const favorite = event.target.closest('[data-fav]');
    if (favorite) return toggleFavorite(favorite);
    remember(event.target.closest('[data-site]'));
  });
  document.addEventListener('auxclick', event => { if (event.button === 1) remember(event.target.closest('[data-site]')); });
  search.addEventListener('input', render);
  document.getElementById('sn-reset').addEventListener('click', () => { search.value = ''; category = 'all'; render(); search.focus(); });
  document.getElementById('sn-lucky').addEventListener('click', () => {
    const all = cards();
    if (!all.length) return;
    const pick = all[Math.floor(Math.random() * all.length)];
    const target = pick.closest('.sn-card');
    pick.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    target.classList.remove('lucky');
    void target.offsetWidth;
    target.classList.add('lucky');
  });
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    const typing = event.target.matches('input, textarea, [contenteditable]');
    if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
      event.preventDefault();
      search.focus();
      search.select();
    } else if (event.key === 'Escape' && (search.value || category !== 'all')) {
      search.value = '';
      category = 'all';
      render();
    } else if (event.target === search && event.key === 'ArrowDown') {
      event.preventDefault();
      cards()[0]?.focus();
    } else if (event.target.matches?.('.sn-link')) {
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const next = move(event.target, event.key);
        if (next) next.focus();
        else if (event.key === 'ArrowUp') search.focus();
      } else if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        toggleFavorite(event.target.parentElement.querySelector('[data-fav]'));
      }
    }
  });
  if (matchMedia('(hover: hover)').matches) {
    results.addEventListener('pointermove', event => {
      const target = event.target.closest('.sn-card');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      target.style.setProperty('--mx', x * 100 + '%');
      target.style.setProperty('--my', y * 100 + '%');
      if (!reduceMotion.matches) {
        target.style.setProperty('--rx', (0.5 - y) * 9 + 'deg');
        target.style.setProperty('--ry', (x - 0.5) * 11 + 'deg');
      }
    });
    results.addEventListener('pointerout', event => {
      const target = event.target.closest('.sn-card');
      if (target && !target.contains(event.relatedTarget)) { target.style.setProperty('--rx', '0deg'); target.style.setProperty('--ry', '0deg'); }
    });
  }
  const total = document.getElementById('sn-total');
  if (reduceMotion.matches) total.textContent = sites.length;
  else {
    const start = performance.now();
    requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / 700);
      total.textContent = Math.round(sites.length * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    });
  }
  render();
})();
