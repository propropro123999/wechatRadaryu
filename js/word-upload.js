(function () {
  let busy = false;
  const isCloud = image => {
    try { const url = new URL(image.src); return url.protocol === 'https:' && (url.hostname === 'catbox.moe' || url.hostname.endsWith('.catbox.moe')); }
    catch (_) { return false; }
  };
  async function uploadImage(image) {
    let data = image.src;
    if (!data.startsWith('data:image/')) data = await fetchExternalImage(data);
    if (!data || !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(data)) throw new Error('无法读取图片，请检查原图地址或重新导入');
    if (data.length > 4 * 1024 * 1024) throw new Error('图片过大，请先缩小图片后重试');
    const response = await fetch('/api/upload-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: data }), signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '上传失败（HTTP ' + response.status + '）');
    const probe = { src: result.url };
    if (!result.url || !isCloud(probe)) throw new Error('上传未返回有效的 Catbox 图片地址');
    image.src = result.url;
    image.dataset.cloudUploaded = 'true';
  }
  window.WordUploads = { get busy() { return busy; } };
  window.uploadAllToCloud = async function () {
    if (busy) return;
    const images = [...document.querySelectorAll('#preview-content img')];
    const status = document.getElementById('cloud-upload-status');
    const list = document.getElementById('cloud-upload-list');
    const button = document.getElementById('btn-cloud-upload');
    if (!images.length) { status.textContent = '没有可上传的图片。'; return; }
    const pending = images.filter(image => !isCloud(image));
    if (!pending.length) { status.textContent = `全部 ${images.length} 张图片已是 Catbox 链接；请在目标编辑器核对图片。`; return; }
    busy = true;
    button.disabled = true;
    list.replaceChildren();
    const rows = new Map();
    for (const image of pending) {
      const row = document.createElement('li');
      row.textContent = `图片 ${images.indexOf(image) + 1}：等待上传`;
      list.append(row); rows.set(image, row);
    }
    let succeeded = 0;
    let failed = 0;
    try {
      for (const image of pending) {
        const row = rows.get(image);
        const label = `图片 ${images.indexOf(image) + 1}：`;
        row.textContent = label + '上传中…';
        status.textContent = `正在上传 ${succeeded + failed + 1}/${pending.length}，已成功 ${succeeded}，失败 ${failed}`;
        try {
          await uploadImage(image);
          succeeded++;
          row.textContent = label + '成功';
          window.wordDraft?.changed();
        } catch (error) {
          failed++;
          row.textContent = label + (error.name === 'TimeoutError' ? '上传超时' : error.message) + '，可重试';
        }
      }
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = failed ? '重试未完成图片' : '检查云端图片';
      status.textContent = failed
        ? `本次成功 ${succeeded} 张，失败 ${failed} 张。失败图片保留原地址；重试只处理未完成项。`
        : `全部 ${images.length} 张图片已是 Catbox 链接。请在目标编辑器核对是否已自行转存。`;
      window.wordDraft?.changed();
    }
  };
})();
