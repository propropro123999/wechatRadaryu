(function () {
  const sources = {
    plotly: ['https://cdn.plot.ly/plotly-2.32.0.min.js', 'Plotly'],
    xlsx: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX'],
    wordcloud: ['https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.js', 'WordCloud'],
    zip: ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'JSZip'],
    mammoth: ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth']
  };
  const pending = new Map();
  function loadOne(name) {
    if (!sources[name]) return Promise.reject(new Error('未知依赖：' + name));
    const [src, globalName] = sources[name];
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (pending.has(name)) return pending.get(name);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let timer;
      const finish = error => {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve(window[globalName]);
      };
      script.src = src;
      script.async = true;
      script.onload = () => finish(window[globalName] ? null : new Error(name + ' 初始化失败，请重试'));
      script.onerror = () => finish(new Error(name + ' 加载失败，请检查网络后重试'));
      timer = setTimeout(() => finish(new Error(name + ' 加载超时，请重试')), 30000);
      document.head.append(script);
    }).catch(error => { pending.delete(name); throw error; });
    pending.set(name, promise);
    return promise;
  }
  window.ToolDependencies = { load: (...names) => Promise.all(names.map(loadOne)) };
})();
