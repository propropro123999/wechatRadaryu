(function () {
  const lifetime = 7 * 24 * 60 * 60 * 1000;
  let database;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('luyu-toolbox-local-drafts', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => { database = null; throw error; });
    return database;
  }
  async function storage(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', mode);
      const request = action(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('本机存储不可用'));
    });
  }
  function cleanHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('script,iframe,object,embed,link,meta,base,style,template,form,input,textarea,select,animate,animateMotion,animateTransform,set').forEach(node => node.remove());
    for (const node of template.content.querySelectorAll('*')) {
      for (const attribute of [...node.attributes]) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.replace(/[\s\u0000-\u001f]/g, '');
        const imageSource = (node.localName === 'img' && name === 'src') ||
          (node.localName === 'image' && ['href', 'xlink:href'].includes(name));
        const dataImage = imageSource && /^data:image\/[a-z0-9.+-]+(?:;base64,|(?:;charset=[^;,]+)?,)/i.test(value);
        if (name.startsWith('on') || ['srcdoc', 'srcset', 'formaction'].includes(name) ||
            (['src', 'href', 'xlink:href'].includes(name) && !dataImage && !/^(https?:|mailto:|tel:|\/(?!\/)|\.\.?\/|#)/i.test(value))) node.removeAttribute(attribute.name);
      }
    }
    return template.innerHTML;
  }

  function mount({ id, container, capture, restore, observe, canRestore = () => true }) {
    const host = document.getElementById(container);
    host.className = 'draft-bar';
    host.innerHTML = '<div class="draft-summary"><label><input type="checkbox" checked> 自动保存本机草稿</label><span class="draft-status" role="status" aria-live="polite">正在检查本机草稿…</span><button type="button" class="draft-clear">清除本机草稿</button></div><div class="draft-recovery" hidden><span></span><button type="button" class="draft-restore">恢复草稿</button><button type="button" class="draft-replace">不恢复，使用当前内容</button></div><small>正文与图片仅保存在此浏览器，7 天后失效；不跨设备同步，共享电脑请关闭保存并清除草稿。</small>';
    const checkbox = host.querySelector('input');
    const status = host.querySelector('.draft-status');
    const recovery = host.querySelector('.draft-recovery');
    let pending = null;
    let dirty = false;
    let busy = false;
    let paused = false;
    let initialized = false;
    let timer;
    let revision = 0;
    let saved = '';
    let queue = Promise.resolve();
    const enqueue = action => (queue = queue.catch(() => {}).then(action));
    try { checkbox.checked = localStorage.getItem('luyu-toolbox-draft-' + id) !== 'off'; } catch (_) {}
    const snapshot = () => JSON.stringify(capture());
    const meaningful = value => !!value?.html && /\S/.test(value.html.replace(/<[^>]*>/g, '')) || /<(img|svg|table)\b/i.test(value?.html || '');
    function changed() {
      if (busy || paused) return;
      dirty = snapshot() !== saved;
      revision++;
      clearTimeout(timer);
      if (dirty && checkbox.checked) {
        status.textContent = pending ? '发现旧草稿，请先选择恢复或使用当前内容。' : '等待保存…';
        timer = setTimeout(save, 800);
      }
    }
    async function save() {
      clearTimeout(timer);
      if (!initialized || !checkbox.checked || pending || busy || paused || !dirty) return;
      const value = capture();
      const serialized = JSON.stringify(value);
      const version = revision;
      if (serialized.length > 16 * 1024 * 1024) { status.textContent = '草稿过大，未保存；请复制或下载内容后再离开。'; return; }
      try {
        await enqueue(() => meaningful(value)
          ? storage('readwrite', store => store.put({ id, ...value, savedAt: Date.now() }))
          : storage('readwrite', store => store.delete(id)));
        if (version === revision) {
          dirty = false; saved = serialized;
          status.textContent = meaningful(value) ? '已保存到本机 · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '当前内容为空，无草稿';
        }
      } catch (_) { status.textContent = '本机保存失败（空间不足或浏览器限制）；请复制或下载后再离开。'; }
    }
    function allowReplace() {
      if (pending && !confirm('有尚未恢复的本机草稿，使用新内容替换它？')) return false;
      pending = null; recovery.hidden = true;
      return true;
    }
    host.querySelector('.draft-restore').onclick = async () => {
      if (!pending || !canRestore() || busy) return;
      if (dirty && !confirm('恢复草稿将替换当前内容，继续？')) return;
      const record = pending;
      paused = true;
      try {
        await restore({ ...record, html: cleanHTML(record.html) });
        pending = null; recovery.hidden = true;
        saved = snapshot(); dirty = false;
        status.textContent = '已恢复本机草稿';
      } catch (_) { status.textContent = '草稿恢复失败，原草稿仍保留。'; }
      finally { paused = false; }
    };
    host.querySelector('.draft-replace').onclick = () => { if (allowReplace()) { changed(); save(); } };
    host.querySelector('.draft-clear').onclick = async () => {
      if (!confirm('清除此工具的本机草稿并关闭自动保存？当前页面内容不会被清空。')) return;
      clearTimeout(timer); revision++; pending = null; recovery.hidden = true; checkbox.checked = false;
      try { localStorage.setItem('luyu-toolbox-draft-' + id, 'off'); } catch (_) {}
      try {
        await enqueue(() => storage('readwrite', store => store.delete(id)));
        saved = ''; dirty = true;
        status.textContent = '本机草稿已清除，自动保存已关闭';
      } catch (_) { status.textContent = '清除失败，请检查浏览器存储设置后重试。'; }
    };
    checkbox.onchange = () => {
      try { localStorage.setItem('luyu-toolbox-draft-' + id, checkbox.checked ? 'on' : 'off'); } catch (_) {}
      if (checkbox.checked) { changed(); save(); }
      else { clearTimeout(timer); status.textContent = '已关闭自动保存；已有草稿可点击清除。'; }
    };
    const ready = (async () => {
      try {
        const record = await storage('readonly', store => store.get(id));
        if (record && Date.now() - record.savedAt < lifetime && typeof record.html === 'string') {
          pending = record; recovery.hidden = false;
          recovery.querySelector('span').textContent = '发现本机草稿 · ' + new Date(record.savedAt).toLocaleString();
          status.textContent = '选择恢复后继续上次工作';
        } else {
          if (record) await storage('readwrite', store => store.delete(id));
          status.textContent = checkbox.checked ? '等待内容，自动保存在本机' : '自动保存已关闭';
        }
      } catch (_) { status.textContent = '此浏览器无法保存草稿，请复制或下载后再离开。'; }
      initialized = true;
      if (dirty) save();
    })();
    if (observe) new MutationObserver(changed).observe(observe, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener('beforeunload', event => {
      if (busy || dirty) { event.preventDefault(); event.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
    return { ready, changed, save, allowReplace, setBusy(value) { busy = value; } };
  }
  window.LocalDrafts = { mount };
})();
