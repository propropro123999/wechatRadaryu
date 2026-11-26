(function () {
  'use strict';

  const PRESETS = {
    idcard: {
      mode: 'text',
      text: '仅用于办理业务，他用无效',
      layout: 'tile',
      fontSize: 28,
      autoScale: true,
      bold: true,
      fontFamily: 'sans',
      color: '#ffffff',
      stroke: true,
      opacity: 38,
      angle: -30,
      gapX: 160,
      gapY: 130,
      stagger: true
    },
    corner: {
      mode: 'text',
      text: '© Luyu',
      layout: 'single',
      position: 'br',
      customX: null,
      customY: null,
      margin: 28,
      fontSize: 32,
      autoScale: true,
      bold: true,
      fontFamily: 'sans',
      color: '#ffffff',
      stroke: true,
      opacity: 82,
      angle: 0
    },
    dense: {
      mode: 'text',
      text: '内部资料 · 请勿外传',
      layout: 'tile',
      fontSize: 22,
      autoScale: true,
      bold: false,
      fontFamily: 'sans',
      color: '#111827',
      stroke: false,
      opacity: 18,
      angle: -25,
      gapX: 110,
      gapY: 95,
      stagger: true
    }
  };

  const FONT_STACKS = {
    sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    serif: 'Georgia, "Songti SC", "SimSun", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resolveOutputMime(format, sourceType) {
    if (format === 'image/png' || format === 'image/jpeg' || format === 'image/webp') return format;
    if (sourceType === 'image/png' || sourceType === 'image/jpeg' || sourceType === 'image/webp') return sourceType;
    return 'image/png';
  }

  function extensionForMime(mime) {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/webp') return 'webp';
    return 'png';
  }

  function outputFileName(originalName, mime, usedNames) {
    const base = String(originalName || 'image').replace(/\.[^.]+$/, '') || 'image';
    const ext = extensionForMime(mime);
    let candidate = `${base}_watermarked.${ext}`;
    if (!usedNames) return candidate;
    let index = 2;
    while (usedNames.has(candidate)) {
      candidate = `${base}_watermarked_${index++}.${ext}`;
    }
    usedNames.add(candidate);
    return candidate;
  }

  function computeSingleAnchor(position, width, height, itemW, itemH, margin) {
    const col = position[1];
    const row = position[0];
    let x = width / 2;
    let y = height / 2;
    if (col === 'l') x = margin + itemW / 2;
    else if (col === 'r') x = width - margin - itemW / 2;
    if (row === 't') y = margin + itemH / 2;
    else if (row === 'b') y = height - margin - itemH / 2;
    return { x, y };
  }

  function isLightColor(hex) {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return true;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }

  function renderWatermarkToCanvas(canvas, sourceImage, logoImage, state, options = {}) {
    const maxDim = options.maxDim || 0;
    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;
    let scale = 1;
    if (maxDim > 0 && Math.max(srcW, srcH) > maxDim) {
      scale = maxDim / Math.max(srcW, srcH);
    }
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceImage, 0, 0, width, height);

    if (options.hideWatermark) return { width, height, box: null };

    const opacity = clamp((Number(state.opacity) || 35) / 100, 0.05, 1);
    const angleDeg = Number(state.angle) || 0;
    const angleRad = (angleDeg * Math.PI) / 180;
    const refScale = state.autoScale ? (width / 1000) : scale;

    ctx.save();
    ctx.globalAlpha = opacity;

    let drawStamp = null;
    let stampW = 0;
    let stampH = 0;

    if (state.mode === 'image') {
      if (!logoImage) {
        ctx.restore();
        return { width, height, box: null };
      }
      const logoNaturalW = logoImage.naturalWidth || logoImage.width;
      const logoNaturalH = logoImage.naturalHeight || logoImage.height;
      const ratio = logoNaturalH / Math.max(1, logoNaturalW);
      stampW = Math.max(16, width * (clamp(Number(state.logoScale) || 18, 4, 80) / 100));
      stampH = Math.max(16, stampW * ratio);
      drawStamp = () => {
        ctx.drawImage(logoImage, -stampW / 2, -stampH / 2, stampW, stampH);
      };
    } else {
      const lines = String(state.text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        ctx.restore();
        return { width, height, box: null };
      }
      const fontSize = Math.max(10, Math.round(clamp(Number(state.fontSize) || 28, 10, 220) * refScale));
      const lineHeight = fontSize * 1.32;
      const fontStack = FONT_STACKS[state.fontFamily] || FONT_STACKS.sans;
      ctx.font = `${state.bold ? '700' : '500'} ${fontSize}px ${fontStack}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = state.color || '#ffffff';

      let maxLineW = 0;
      for (const line of lines) {
        maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
      }
      stampW = Math.max(fontSize, maxLineW);
      stampH = lines.length * lineHeight;

      const isLightText = isLightColor(state.color || '#ffffff');
      const strokeColor = isLightText ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.65)';
      const strokeWidth = Math.max(1.5, fontSize * 0.09);

      drawStamp = () => {
        const startY = -((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
          const y = startY + i * lineHeight;
          if (state.stroke) {
            ctx.lineJoin = 'round';
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.strokeText(lines[i], 0, y);
          }
          ctx.fillText(lines[i], 0, y);
        }
      };
    }

    let box = null;
    if (state.layout === 'single') {
      const margin = Math.max(0, (Number(state.margin) || 24) * refScale);
      const cos = Math.abs(Math.cos(angleRad));
      const sin = Math.abs(Math.sin(angleRad));
      const boxW = stampW * cos + stampH * sin;
      const boxH = stampW * sin + stampH * cos;
      let anchor;
      if (typeof state.customX === 'number' && typeof state.customY === 'number') {
        anchor = { x: clamp(state.customX, 0, 1) * width, y: clamp(state.customY, 0, 1) * height };
      } else {
        anchor = computeSingleAnchor(state.position || 'br', width, height, boxW, boxH, margin);
      }
      ctx.translate(anchor.x, anchor.y);
      ctx.rotate(angleRad);
      drawStamp();
      box = { cx: anchor.x, cy: anchor.y, w: stampW, h: stampH, angleDeg };
    } else {
      const gapX = Math.max(24, (Number(state.gapX) || 140) * refScale);
      const gapY = Math.max(24, (Number(state.gapY) || 120) * refScale);
      const stepX = stampW + gapX;
      const stepY = stampH + gapY;
      const diag = Math.hypot(width, height);
      ctx.translate(width / 2, height / 2);
      ctx.rotate(angleRad);
      const cols = Math.ceil(diag / stepX) + 2;
      const rows = Math.ceil(diag / stepY) + 2;
      for (let r = -rows; r <= rows; r++) {
        const offsetX = state.stagger && (Math.abs(r) % 2 === 1) ? stepX / 2 : 0;
        for (let c = -cols; c <= cols; c++) {
          ctx.save();
          ctx.translate(c * stepX + offsetX, r * stepY);
          drawStamp();
          ctx.restore();
        }
      }
      // Center reference box in tile mode so users can also drag-scale directly on canvas!
      box = { cx: width / 2, cy: height / 2, w: stampW, h: stampH, angleDeg };
    }

    ctx.restore();
    return { width, height, box };
  }

  function scaleWatermarkSize(state, factor) {
    if (state.mode === 'image') {
      return { logoScale: Math.round(clamp((Number(state.logoScale) || 18) * factor, 4, 80) * 10) / 10 };
    }
    return { fontSize: Math.round(clamp((Number(state.fontSize) || 28) * factor, 10, 220)) };
  }

  window.WatermarkEngine = {
    PRESETS,
    clamp,
    resolveOutputMime,
    extensionForMime,
    outputFileName,
    computeSingleAnchor,
    renderWatermarkToCanvas,
    scaleWatermarkSize,
    isLightColor
  };

  if (typeof document === 'undefined' || !document.getElementById('wm-canvas')) return;

  const state = {
    ...PRESETS.idcard,
    position: 'br',
    customX: null,
    customY: null,
    margin: 28,
    logoScale: 18,
    format: 'auto',
    quality: 92
  };
  const files = [];
  let activeIndex = -1;
  let logoImage = null;
  let logoUrl = '';
  let comparingOriginal = false;
  let renderFrame = 0;
  let lastRender = { width: 0, height: 0, box: null };
  let activeDrag = null;

  const els = {
    dropzone: document.getElementById('wm-dropzone'),
    fileInput: document.getElementById('wm-file-input'),
    addMoreBtn: document.getElementById('wm-add-more'),
    clearBtn: document.getElementById('wm-clear-all'),
    previewStage: document.getElementById('wm-stage'),
    canvasWrap: document.getElementById('wm-canvas-wrap'),
    emptyState: document.getElementById('wm-empty'),
    canvas: document.getElementById('wm-canvas'),
    overlay: document.getElementById('wm-overlay'),
    overlayBox: document.getElementById('wm-overlay-box'),
    overlayRotate: document.getElementById('wm-overlay-rotate'),
    overlayHandles: [...document.querySelectorAll('[data-wm-handle]')],
    zoomOutBtn: document.getElementById('wm-zoom-out'),
    zoomInBtn: document.getElementById('wm-zoom-in'),
    zoomLabel: document.getElementById('wm-zoom-label'),
    compareBtn: document.getElementById('wm-compare-btn'),
    previewMeta: document.getElementById('wm-preview-meta'),
    thumbList: document.getElementById('wm-thumb-list'),
    countBadge: document.getElementById('wm-count-badge'),
    downloadOneBtn: document.getElementById('wm-download-one'),
    downloadAllBtn: document.getElementById('wm-download-all'),
    status: document.getElementById('wm-status'),
    modeButtons: [...document.querySelectorAll('[data-wm-mode]')],
    layoutButtons: [...document.querySelectorAll('[data-wm-layout]')],
    presetButtons: [...document.querySelectorAll('[data-wm-preset]')],
    textPanel: document.getElementById('wm-text-panel'),
    imagePanel: document.getElementById('wm-image-panel'),
    tilePanel: document.getElementById('wm-tile-panel'),
    singlePanel: document.getElementById('wm-single-panel'),
    textInput: document.getElementById('wm-text'),
    fontSize: document.getElementById('wm-font-size'),
    fontSizeVal: document.getElementById('wm-font-size-val'),
    autoScale: document.getElementById('wm-auto-scale'),
    bold: document.getElementById('wm-bold'),
    stroke: document.getElementById('wm-stroke'),
    fontFamily: document.getElementById('wm-font-family'),
    color: document.getElementById('wm-color'),
    swatches: [...document.querySelectorAll('[data-wm-color]')],
    logoInput: document.getElementById('wm-logo-input'),
    logoBtn: document.getElementById('wm-logo-btn'),
    logoPreview: document.getElementById('wm-logo-preview'),
    logoClear: document.getElementById('wm-logo-clear'),
    logoScale: document.getElementById('wm-logo-scale'),
    logoScaleVal: document.getElementById('wm-logo-scale-val'),
    opacity: document.getElementById('wm-opacity'),
    opacityVal: document.getElementById('wm-opacity-val'),
    angle: document.getElementById('wm-angle'),
    angleVal: document.getElementById('wm-angle-val'),
    gapX: document.getElementById('wm-gap-x'),
    gapXVal: document.getElementById('wm-gap-x-val'),
    gapY: document.getElementById('wm-gap-y'),
    gapYVal: document.getElementById('wm-gap-y-val'),
    stagger: document.getElementById('wm-stagger'),
    margin: document.getElementById('wm-margin'),
    marginVal: document.getElementById('wm-margin-val'),
    gridCells: [...document.querySelectorAll('[data-wm-pos]')],
    format: document.getElementById('wm-format'),
    qualityWrap: document.getElementById('wm-quality-wrap'),
    quality: document.getElementById('wm-quality'),
    qualityVal: document.getElementById('wm-quality-val')
  };

  function setStatus(message) {
    if (els.status) els.status.textContent = message || '';
  }

  function updateSizeReadout() {
    els.fontSize.value = state.fontSize;
    els.fontSizeVal.textContent = `${state.fontSize}px`;
    els.logoScale.value = Math.round(state.logoScale);
    els.logoScaleVal.textContent = `${Math.round(state.logoScale)}%`;
    els.angle.value = Math.round(state.angle);
    els.angleVal.textContent = `${Math.round(state.angle)}°`;
    if (els.zoomLabel) {
      els.zoomLabel.textContent = state.mode === 'image' ? `Logo ${Math.round(state.logoScale)}%` : `字号 ${state.fontSize}px`;
    }
  }

  function syncControlsFromState() {
    els.modeButtons.forEach(btn => {
      const active = btn.dataset.wmMode === state.mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    els.layoutButtons.forEach(btn => {
      const active = btn.dataset.wmLayout === state.layout;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    els.textPanel.hidden = state.mode !== 'text';
    els.imagePanel.hidden = state.mode !== 'image';
    els.tilePanel.hidden = state.layout !== 'tile';
    els.singlePanel.hidden = state.layout !== 'single';

    els.textInput.value = state.text;
    els.autoScale.checked = !!state.autoScale;
    els.bold.checked = !!state.bold;
    els.stroke.checked = !!state.stroke;
    els.fontFamily.value = state.fontFamily;
    els.color.value = state.color;
    els.swatches.forEach(s => s.classList.toggle('active', s.dataset.wmColor.toLowerCase() === state.color.toLowerCase()));

    els.opacity.value = state.opacity;
    els.opacityVal.textContent = `${state.opacity}%`;
    els.gapX.value = state.gapX;
    els.gapXVal.textContent = `${state.gapX}px`;
    els.gapY.value = state.gapY;
    els.gapYVal.textContent = `${state.gapY}px`;
    els.stagger.checked = !!state.stagger;
    els.margin.value = state.margin;
    els.marginVal.textContent = `${state.margin}px`;
    const usingCustomPos = typeof state.customX === 'number' && typeof state.customY === 'number';
    els.gridCells.forEach(cell => {
      const active = !usingCustomPos && cell.dataset.wmPos === state.position;
      cell.classList.toggle('active', active);
      cell.setAttribute('aria-pressed', String(active));
    });
    els.format.value = state.format;
    els.quality.value = state.quality;
    els.qualityVal.textContent = `${state.quality}%`;
    els.qualityWrap.hidden = state.format === 'image/png';
    updateSizeReadout();
  }

  function syncOverlayPosition() {
    if (!els.overlay || !els.overlayBox) return;
    const { width, height, box } = lastRender;
    if (!box || !width || !height || comparingOriginal || !files.length) {
      els.overlay.hidden = true;
      return;
    }
    const displayW = els.canvas.clientWidth;
    const displayH = els.canvas.clientHeight;
    if (!displayW || !displayH) {
      els.overlay.hidden = true;
      return;
    }
    const sx = displayW / width;
    const sy = displayH / height;
    const pad = 10;
    const boxW = Math.max(36, box.w * sx + pad * 2);
    const boxH = Math.max(28, box.h * sy + pad * 2);
    const left = box.cx * sx - boxW / 2;
    const top = box.cy * sy - boxH / 2;

    els.overlay.hidden = false;
    els.overlay.dataset.layout = state.layout;
    els.overlayBox.style.width = `${boxW.toFixed(1)}px`;
    els.overlayBox.style.height = `${boxH.toFixed(1)}px`;
    els.overlayBox.style.left = `${left.toFixed(1)}px`;
    els.overlayBox.style.top = `${top.toFixed(1)}px`;
    els.overlayBox.style.transform = `rotate(${box.angleDeg}deg)`;
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      renderPreview();
    });
  }

  function renderPreview() {
    const hasFiles = files.length > 0 && activeIndex >= 0 && activeIndex < files.length;
    els.emptyState.hidden = hasFiles;
    els.previewStage.hidden = !hasFiles;
    els.downloadOneBtn.disabled = !hasFiles;
    els.downloadAllBtn.disabled = !hasFiles;
    els.clearBtn.disabled = !hasFiles;
    els.countBadge.textContent = String(files.length);

    if (!hasFiles) {
      lastRender = { width: 0, height: 0, box: null };
      if (els.overlay) els.overlay.hidden = true;
      els.previewMeta.textContent = '';
      return;
    }

    const current = files[activeIndex];
    lastRender = renderWatermarkToCanvas(els.canvas, current.img, logoImage, state, {
      maxDim: 1600,
      hideWatermark: comparingOriginal
    });
    syncOverlayPosition();
    const mime = resolveOutputMime(state.format, current.file.type);
    const sizeText = formatBytes(current.file.size);
    els.previewMeta.textContent = `${current.file.name} · ${current.img.naturalWidth} × ${current.img.naturalHeight} · ${sizeText} · 输出 ${extensionForMime(mime).toUpperCase()}`;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function applyScaleFactor(factor) {
    Object.assign(state, scaleWatermarkSize(state, factor));
    updateSizeReadout();
    scheduleRender();
  }

  function renderThumbs() {
    els.thumbList.replaceChildren();
    files.forEach((entry, idx) => {
      const card = document.createElement('div');
      card.className = 'wm-thumb' + (idx === activeIndex ? ' active' : '');
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.title = entry.file.name;
      card.addEventListener('click', () => {
        activeIndex = idx;
        renderThumbs();
        scheduleRender();
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeIndex = idx;
          renderThumbs();
          scheduleRender();
        }
      });

      const img = document.createElement('img');
      img.src = entry.url;
      img.alt = entry.file.name;

      const label = document.createElement('span');
      label.className = 'wm-thumb-name';
      label.textContent = entry.file.name;

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'wm-thumb-del';
      del.setAttribute('aria-label', '移除 ' + entry.file.name);
      del.innerHTML = window.workspaceIcon ? window.workspaceIcon('close') : '×';
      del.addEventListener('click', e => {
        e.stopPropagation();
        URL.revokeObjectURL(entry.url);
        files.splice(idx, 1);
        if (!files.length) activeIndex = -1;
        else if (activeIndex >= files.length) activeIndex = files.length - 1;
        renderThumbs();
        scheduleRender();
      });

      card.append(img, label, del);
      els.thumbList.append(card);
    });
  }

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ file, url, img });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`无法读取图片：${file.name}`));
      };
      img.src = url;
    });
  }

  async function addFiles(fileList) {
    const incoming = [...fileList].filter(file => /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name));
    if (!incoming.length) {
      setStatus('请选择 JPG、PNG 或 WebP 图片文件。');
      return;
    }
    setStatus(`正在载入 ${incoming.length} 张图片…`);
    let added = 0;
    const errors = [];
    for (const file of incoming) {
      try {
        const entry = await loadImageFile(file);
        files.push(entry);
        added++;
      } catch (err) {
        errors.push(err.message);
      }
    }
    if (added > 0 && activeIndex === -1) activeIndex = 0;
    renderThumbs();
    scheduleRender();
    setStatus(errors.length ? `已载入 ${added} 张，失败 ${errors.length} 张。` : `已载入 ${files.length} 张图片，可在画布上直接拖拽角点缩放水印。`);
  }

  async function loadLogoFile(file) {
    if (!file) return;
    try {
      const loaded = await loadImageFile(file);
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      logoImage = loaded.img;
      logoUrl = loaded.url;
      els.logoPreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = logoUrl;
      img.alt = 'Logo 水印预览';
      els.logoPreview.append(img);
      els.logoPreview.hidden = false;
      els.logoClear.hidden = false;
      scheduleRender();
      setStatus(`已载入水印 Logo：${file.name}`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('导出图片失败'));
      }, mime, quality);
    });
  }

  async function renderFullResolutionBlob(entry) {
    const offscreen = document.createElement('canvas');
    renderWatermarkToCanvas(offscreen, entry.img, logoImage, state);
    const mime = resolveOutputMime(state.format, entry.file.type);
    const quality = mime === 'image/png' ? undefined : clamp(state.quality / 100, 0.1, 1);
    const blob = await canvasToBlob(offscreen, mime, quality);
    offscreen.width = 0;
    offscreen.height = 0;
    return { blob, mime };
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function downloadCurrent() {
    if (activeIndex < 0 || !files[activeIndex]) return;
    if (state.mode === 'image' && !logoImage) {
      setStatus('请先上传一张 Logo 水印图片，或切换到文字水印。');
      return;
    }
    const entry = files[activeIndex];
    els.downloadOneBtn.disabled = true;
    setStatus('正在生成高清原图…');
    try {
      const { blob, mime } = await renderFullResolutionBlob(entry);
      const name = outputFileName(entry.file.name, mime);
      triggerDownload(blob, name);
      setStatus(`已导出 ${name}（${formatBytes(blob.size)}）`);
      window.LuyuPlayful?.cheer('水印盖好啦');
    } catch (err) {
      setStatus(err.message);
    } finally {
      els.downloadOneBtn.disabled = files.length === 0;
    }
  }

  async function downloadAllZip() {
    if (!files.length) return;
    if (state.mode === 'image' && !logoImage) {
      setStatus('请先上传一张 Logo 水印图片，或切换到文字水印。');
      return;
    }
    if (files.length === 1) {
      await downloadCurrent();
      return;
    }
    els.downloadAllBtn.disabled = true;
    els.downloadOneBtn.disabled = true;
    const job = window.LuyuPlayful?.busy('image');
    try {
      setStatus('正在加载打包组件…');
      const JSZip = await window.ToolDependencies.load('zip');
      const zip = new JSZip();
      const usedNames = new Set();
      for (let i = 0; i < files.length; i++) {
        setStatus(`正在处理 ${i + 1} / ${files.length}：${files[i].file.name}`);
        const { blob, mime } = await renderFullResolutionBlob(files[i]);
        zip.file(outputFileName(files[i].file.name, mime, usedNames), blob);
      }
      setStatus('正在打包 ZIP…');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `watermarked_${new Date().toISOString().slice(0, 10)}.zip`;
      triggerDownload(zipBlob, zipName);
      setStatus(`已打包导出 ${files.length} 张图片（${formatBytes(zipBlob.size)}）`);
      job?.done(`搞定，${files.length} 张图都盖好水印了`);
    } catch (err) {
      setStatus(err.message || '批量导出失败，请重试');
      job?.fail();
    } finally {
      els.downloadAllBtn.disabled = files.length === 0;
      els.downloadOneBtn.disabled = files.length === 0;
    }
  }

  // ---- Interactive On-Canvas Drag, Resize & Rotate ----
  function startCanvasInteraction(type, event) {
    if (!lastRender.box || !lastRender.width || !lastRender.height) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = els.canvas.getBoundingClientRect();
    const cx = rect.left + (lastRender.box.cx / lastRender.width) * rect.width;
    const cy = rect.top + (lastRender.box.cy / lastRender.height) * rect.height;
    const startDist = Math.max(12, Math.hypot(event.clientX - cx, event.clientY - cy));
    const startPointerAngle = Math.atan2(event.clientY - cy, event.clientX - cx);

    activeDrag = {
      type,
      rect,
      cx,
      cy,
      startX: event.clientX,
      startY: event.clientY,
      startDist,
      startPointerAngle,
      startFontSize: state.fontSize,
      startLogoScale: state.logoScale,
      startAngle: state.angle,
      startNormX: lastRender.box.cx / lastRender.width,
      startNormY: lastRender.box.cy / lastRender.height
    };
    els.overlayBox.classList.add('dragging');
  }

  els.overlayBox.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-wm-handle]') || e.target.closest('#wm-overlay-rotate')) return;
    if (state.layout !== 'single') return;
    startCanvasInteraction('move', e);
  });
  els.overlayHandles.forEach(handle => {
    handle.addEventListener('pointerdown', e => startCanvasInteraction('resize', e));
  });
  els.overlayRotate.addEventListener('pointerdown', e => startCanvasInteraction('rotate', e));

  window.addEventListener('pointermove', e => {
    if (!activeDrag) return;
    if (activeDrag.type === 'move') {
      const dx = (e.clientX - activeDrag.startX) / Math.max(1, activeDrag.rect.width);
      const dy = (e.clientY - activeDrag.startY) / Math.max(1, activeDrag.rect.height);
      state.customX = clamp(activeDrag.startNormX + dx, 0.02, 0.98);
      state.customY = clamp(activeDrag.startNormY + dy, 0.02, 0.98);
      els.gridCells.forEach(cell => { cell.classList.remove('active'); cell.setAttribute('aria-pressed', 'false'); });
      scheduleRender();
    } else if (activeDrag.type === 'resize') {
      const dist = Math.max(8, Math.hypot(e.clientX - activeDrag.cx, e.clientY - activeDrag.cy));
      const factor = dist / activeDrag.startDist;
      if (state.mode === 'image') {
        state.logoScale = Math.round(clamp(activeDrag.startLogoScale * factor, 4, 80) * 10) / 10;
      } else {
        state.fontSize = Math.round(clamp(activeDrag.startFontSize * factor, 10, 220));
      }
      updateSizeReadout();
      scheduleRender();
    } else if (activeDrag.type === 'rotate') {
      const currentAngle = Math.atan2(e.clientY - activeDrag.cy, e.clientX - activeDrag.cx);
      let deg = activeDrag.startAngle + ((currentAngle - activeDrag.startPointerAngle) * 180) / Math.PI;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      // Snap gently near 0 / ±45 / ±90 / ±30
      for (const snap of [-90, -45, -30, 0, 30, 45, 90]) {
        if (Math.abs(deg - snap) < 2.5) { deg = snap; break; }
      }
      state.angle = Math.round(clamp(deg, -180, 180));
      updateSizeReadout();
      scheduleRender();
    }
  });

  const endDrag = () => {
    if (!activeDrag) return;
    activeDrag = null;
    els.overlayBox.classList.remove('dragging');
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', syncOverlayPosition);

  // Mouse-wheel zoom directly on watermark box (or Ctrl/Alt+wheel anywhere on preview canvas)
  els.canvasWrap.addEventListener('wheel', e => {
    if (!files.length) return;
    const onBox = e.target.closest('#wm-overlay-box');
    if (!onBox && !e.ctrlKey && !e.altKey) return;
    e.preventDefault();
    applyScaleFactor(e.deltaY < 0 ? 1.08 : 1 / 1.08);
  }, { passive: false });

  els.zoomOutBtn.addEventListener('click', () => applyScaleFactor(0.88));
  els.zoomInBtn.addEventListener('click', () => applyScaleFactor(1.14));

  // ---- Standard Event Wiring ----
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
  });
  els.dropzone.addEventListener('dragover', e => { e.preventDefault(); els.dropzone.classList.add('active'); });
  els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('active'));
  els.dropzone.addEventListener('drop', e => {
    e.preventDefault();
    els.dropzone.classList.remove('active');
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
  els.fileInput.addEventListener('change', e => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  });
  els.addMoreBtn.addEventListener('click', () => els.fileInput.click());
  els.clearBtn.addEventListener('click', () => {
    files.forEach(entry => URL.revokeObjectURL(entry.url));
    files.length = 0;
    activeIndex = -1;
    renderThumbs();
    scheduleRender();
    setStatus('已清空全部图片。');
  });

  document.addEventListener('paste', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const pasted = [...(e.clipboardData?.files || [])];
    if (pasted.length) addFiles(pasted);
  });

  const setCompare = active => {
    if (comparingOriginal === active) return;
    comparingOriginal = active;
    els.compareBtn.classList.toggle('active', active);
    scheduleRender();
  };
  els.compareBtn.addEventListener('pointerdown', () => setCompare(true));
  els.compareBtn.addEventListener('pointerup', () => setCompare(false));
  els.compareBtn.addEventListener('pointerleave', () => setCompare(false));
  els.compareBtn.addEventListener('pointercancel', () => setCompare(false));
  els.compareBtn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') setCompare(true); });
  els.compareBtn.addEventListener('keyup', () => setCompare(false));

  els.modeButtons.forEach(btn => btn.addEventListener('click', () => {
    state.mode = btn.dataset.wmMode;
    syncControlsFromState();
    scheduleRender();
  }));
  els.layoutButtons.forEach(btn => btn.addEventListener('click', () => {
    state.layout = btn.dataset.wmLayout;
    syncControlsFromState();
    scheduleRender();
  }));
  els.presetButtons.forEach(btn => btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.wmPreset];
    if (!preset) return;
    Object.assign(state, preset);
    syncControlsFromState();
    scheduleRender();
    setStatus(`已套用「${btn.textContent.trim()}」预设`);
  }));

  els.textInput.addEventListener('input', () => { state.text = els.textInput.value; scheduleRender(); });
  els.fontSize.addEventListener('input', () => { state.fontSize = Number(els.fontSize.value); updateSizeReadout(); scheduleRender(); });
  els.autoScale.addEventListener('change', () => { state.autoScale = els.autoScale.checked; scheduleRender(); });
  els.bold.addEventListener('change', () => { state.bold = els.bold.checked; scheduleRender(); });
  els.stroke.addEventListener('change', () => { state.stroke = els.stroke.checked; scheduleRender(); });
  els.fontFamily.addEventListener('change', () => { state.fontFamily = els.fontFamily.value; scheduleRender(); });
  els.color.addEventListener('input', () => {
    state.color = els.color.value;
    els.swatches.forEach(s => s.classList.toggle('active', s.dataset.wmColor.toLowerCase() === state.color.toLowerCase()));
    scheduleRender();
  });
  els.swatches.forEach(swatch => swatch.addEventListener('click', () => {
    state.color = swatch.dataset.wmColor;
    syncControlsFromState();
    scheduleRender();
  }));

  els.logoBtn.addEventListener('click', () => els.logoInput.click());
  els.logoInput.addEventListener('change', e => {
    if (e.target.files?.[0]) loadLogoFile(e.target.files[0]);
    e.target.value = '';
  });
  els.logoClear.addEventListener('click', () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoImage = null;
    logoUrl = '';
    els.logoPreview.innerHTML = '';
    els.logoPreview.hidden = true;
    els.logoClear.hidden = true;
    scheduleRender();
  });
  els.logoScale.addEventListener('input', () => { state.logoScale = Number(els.logoScale.value); updateSizeReadout(); scheduleRender(); });

  els.opacity.addEventListener('input', () => { state.opacity = Number(els.opacity.value); els.opacityVal.textContent = `${state.opacity}%`; scheduleRender(); });
  els.angle.addEventListener('input', () => { state.angle = Number(els.angle.value); updateSizeReadout(); scheduleRender(); });
  els.gapX.addEventListener('input', () => { state.gapX = Number(els.gapX.value); els.gapXVal.textContent = `${state.gapX}px`; scheduleRender(); });
  els.gapY.addEventListener('input', () => { state.gapY = Number(els.gapY.value); els.gapYVal.textContent = `${state.gapY}px`; scheduleRender(); });
  els.stagger.addEventListener('change', () => { state.stagger = els.stagger.checked; scheduleRender(); });
  els.margin.addEventListener('input', () => { state.margin = Number(els.margin.value); els.marginVal.textContent = `${state.margin}px`; scheduleRender(); });

  els.gridCells.forEach(cell => cell.addEventListener('click', () => {
    state.position = cell.dataset.wmPos;
    state.customX = null;
    state.customY = null;
    syncControlsFromState();
    scheduleRender();
  }));

  els.format.addEventListener('change', () => {
    state.format = els.format.value;
    els.qualityWrap.hidden = state.format === 'image/png';
    scheduleRender();
  });
  els.quality.addEventListener('input', () => { state.quality = Number(els.quality.value); els.qualityVal.textContent = `${state.quality}%`; });

  els.downloadOneBtn.addEventListener('click', downloadCurrent);
  els.downloadAllBtn.addEventListener('click', downloadAllZip);

  syncControlsFromState();
  renderPreview();
})();
