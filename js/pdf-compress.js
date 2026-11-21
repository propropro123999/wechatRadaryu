let currentPDF = null;
let currentPDFData = null;
let currentPageIndex = 0;
let compressedPDFData = null;
let pdfWorker = null;
let pdfMood = null;
let previewTask = null;
let loadingTask = null;
let loadVersion = 0;
let previewVersion = 0;
let pdfjsPromise;

function pdfStatus(message) {
  document.getElementById('pdf-status').textContent = message;
}

async function loadRenderer() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      return lib;
    }).catch(error => { pdfjsPromise = null; throw error; });
  }
  return pdfjsPromise;
}

function handleFileSelect(event) { if (event.target.files[0]) loadPDF(event.target.files[0]); }
function handleDrop(event) {
  event.preventDefault();
  handleDragLeave(event);
  if (event.dataTransfer.files[0]) loadPDF(event.dataTransfer.files[0]);
}
function handleDragOver(event) { event.preventDefault(); document.getElementById('upload-area').classList.add('dragover'); }
function handleDragLeave(event) { event.preventDefault(); document.getElementById('upload-area').classList.remove('dragover'); }

async function loadPDF(file) {
  if (pdfWorker) return pdfStatus('请先取消当前压缩，再选择文件。');
  if (!/\.pdf$/i.test(file.name) || file.size > 200 * 1024 * 1024) return pdfStatus('请选择不超过 200MB 的 PDF 文件。');
  resetTool();
  const version = loadVersion;
  document.getElementById('compress-pdf').disabled = true;
  pdfStatus('正在加载本地 PDF 处理组件…');
  try {
    const [lib, buffer] = await Promise.all([loadRenderer(), file.arrayBuffer()]);
    if (version !== loadVersion) return;
    currentPDFData = new Uint8Array(buffer);
    loadingTask = lib.getDocument({ data: currentPDFData.slice(), isEvalSupported: false });
    const pdf = await loadingTask.promise;
    if (version !== loadVersion) { pdf.destroy(); return; }
    currentPDF = pdf;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = formatFileSize(file.size);
    document.getElementById('file-pages').textContent = pdf.numPages;
    document.getElementById('preview-panel').classList.add('show');
    document.getElementById('compress-pdf').disabled = false;
    await renderPreview();
    pdfStatus('预览已就绪。文件仅在本机处理，不会上传。');
  } catch (error) {
    if (version !== loadVersion) return;
    resetTool();
    pdfStatus('PDF 加载失败：' + error.message + '。请重新选择文件重试；加密 PDF 请先解密。');
  }
}

async function renderPreview() {
  if (!currentPDF) return;
  const version = ++previewVersion;
  const previous = previewTask;
  previous?.cancel();
  if (previous) await previous.promise.catch(() => {});
  if (version !== previewVersion || !currentPDF) return;
  try {
    const page = await currentPDF.getPage(currentPageIndex + 1);
    if (version !== previewVersion) return;
    const canvas = document.getElementById('preview-canvas');
    const viewport = page.getViewport({ scale: Math.min(1.5, 1400 / page.getViewport({ scale: 1 }).width) });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    previewTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    await previewTask.promise;
    if (version === previewVersion) document.getElementById('page-indicator').textContent = `第 ${currentPageIndex + 1} / ${currentPDF.numPages} 页`;
  } catch (error) {
    if (version === previewVersion && error.name !== 'RenderingCancelledException') pdfStatus('此页预览失败：' + error.message);
  }
}
function previousPage() { if (currentPageIndex > 0) { currentPageIndex--; renderPreview(); } }
function nextPage() { if (currentPDF && currentPageIndex < currentPDF.numPages - 1) { currentPageIndex++; renderPreview(); } }
function updateQualityValue() { document.getElementById('quality-value').textContent = document.getElementById('quality-slider').value + '%'; }
function updateMaxWidthValue() { document.getElementById('max-width-value').textContent = document.getElementById('max-width').value; }
function setStrength(strength) {
  const settings = { fast: [85, 1280, '较高画质，适合日常文档'], medium: [70, 960, '平衡图片质量与文件大小'], maximum: [50, 640, '更小图片，细节可能损失'] };
  if (!settings[strength]) return;
  const [quality, maxWidth, hint] = settings[strength];
  document.querySelectorAll('.strength-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.strength === strength);
    btn.setAttribute('aria-pressed', String(btn.dataset.strength === strength));
  });
  document.getElementById('quality-slider').value = quality;
  document.getElementById('max-width').value = maxWidth;
  document.getElementById('strength-hint').textContent = hint;
  updateQualityValue(); updateMaxWidthValue();
}

function stopCompression() {
  pdfMood?.hide();
  pdfWorker?.terminate();
  pdfWorker = null;
  document.getElementById('progress-card').style.display = 'none';
  document.getElementById('compress-pdf').disabled = !currentPDF;
}
function cancelCompression() { stopCompression(); pdfStatus('已取消压缩，原文件未改变，可调整参数重试。'); }
function compressPDF() {
  if (pdfWorker || !currentPDFData) return;
  const quality = Number(document.getElementById('quality-slider').value);
  const maxWidth = Number(document.getElementById('max-width').value);
  if (!Number.isFinite(maxWidth) || maxWidth < 600 || maxWidth > 2560) return pdfStatus('最大宽度应为 600–2560 px。');
  compressedPDFData = null;
  document.getElementById('result-card').style.display = 'none';
  document.getElementById('progress-card').style.display = 'block';
  document.getElementById('compress-pdf').disabled = true;
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-percent').textContent = '0%';
  document.getElementById('progress-detail').textContent = '加载压缩组件…';
  pdfMood = window.LuyuPlayful?.busy('pdf');
  const fail = message => { pdfMood?.fail(); stopCompression(); pdfStatus('压缩失败：' + message + '。原文件未改变，可重试。'); };
  try {
    const worker = pdfWorker = new Worker('js/pdf-compress-worker.js');
    worker.onerror = () => { if (pdfWorker === worker) fail('压缩组件加载或运行出错，请检查网络'); };
    worker.onmessage = ({ data }) => {
      if (pdfWorker !== worker) return;
      if (data.type === 'error') return fail(data.message);
      if (data.type === 'progress') {
        document.getElementById('progress-percent').textContent = data.percent + '%';
        document.getElementById('progress-bar').style.width = data.percent + '%';
        document.getElementById('progress-detail').textContent = `检查图片 ${data.current}/${data.total}，随后保存文档`;
      }
      if (data.type === 'complete') {
        compressedPDFData = data.data;
        const saved = Math.round((1 - data.data.byteLength / currentPDFData.byteLength) * 100);
        pdfMood?.done(data.unchanged || saved <= 0 ? '这份已经很瘦了，没什么可减的' : '压完了，瘦了 ' + saved + '%', { confetti: !data.unchanged && saved > 0 });
        stopCompression();
        document.getElementById('result-card').style.display = 'block';
        // 结果卡在页面最下方，居中滚到眼前，也让右下角的气泡压不到数字
        document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('result-original').textContent = formatFileSize(currentPDFData.byteLength);
        document.getElementById('result-compressed').textContent = formatFileSize(data.data.byteLength);
        document.getElementById('result-rate').textContent = Math.round((1 - data.data.byteLength / currentPDFData.byteLength) * 100) + '%';
        document.getElementById('result-note').textContent = data.unchanged
          ? '未发现更小的结果，下载将保留原文件（未移除元数据）。文字型、已压缩或非 JPEG 图片的 PDF 可能无法进一步缩小。'
          : (data.optimized ? `已优化 ${data.optimized} 张 JPEG 图片，保留文字与矢量内容` : '没有可重新压缩的 JPEG 图片，减小的部分来自整理文件结构') +
            (data.skipped ? `；${data.skipped} 张特殊编码或带蒙版的图片保持原样。` : '。');
        pdfStatus(data.unchanged ? '处理完成，文件未减小，未重复压缩。' : '压缩完成，请下载并核对画质，保留原文件。');
      }
    };
    const copy = currentPDFData.slice();
    worker.postMessage({ pdfData: copy, quality, maxWidth, removeMetadata: document.getElementById('remove-metadata').checked }, [copy.buffer]);
  } catch (error) { fail(error.message); }
}
function downloadPDF() {
  if (!compressedPDFData) return;
  const url = URL.createObjectURL(new Blob([compressedPDFData], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = document.getElementById('file-name').textContent.replace(/\.pdf$/i, '') + '-优化.pdf';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function resetTool() {
  ++loadVersion; ++previewVersion;
  stopCompression();
  previewTask?.cancel(); previewTask = null;
  loadingTask?.destroy(); loadingTask = null;
  currentPDF = null; currentPDFData = null; currentPageIndex = 0; compressedPDFData = null;
  document.getElementById('compress-pdf').disabled = true;
  document.getElementById('file-input').value = '';
  document.getElementById('preview-panel').classList.remove('show');
  document.getElementById('result-card').style.display = 'none';
  pdfStatus('');
}
function formatFileSize(bytes) {
  const unit = bytes ? Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024))) : 0;
  return (bytes / 1024 ** unit).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][unit];
}
setStrength('medium');
