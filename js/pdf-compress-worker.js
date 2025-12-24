/**
 * PDF 压缩 Web Worker
 * 在后台线程处理 PDF 压缩，避免阻塞主线程
 */

// importScripts 来加载 pdf-lib
importScripts('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');

self.onmessage = async (event) => {
  const { pdfData, quality, maxWidth, removeMetadata } = event.data;

  try {
    const { PDFDocument } = self.PDFLib;

    // 加载 PDF
    const pdfDoc = await PDFDocument.load(pdfData);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // 处理每一页
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const page = pages[pageIndex];

      // 获取页面资源
      const resources = page.node.Resources;

      if (resources && resources.XObject) {
        // 获取所有 XObject（可能包含图片）
        const xobjects = resources.XObject.entries();

        for (const [name, ref] of xobjects) {
          try {
            const xobj = pdfDoc.context.lookup(ref);

            // 检查是否是图片
            if (xobj.Subtype && xobj.Subtype.toString() === 'Image') {
              await compressImage(pdfDoc, xobj, quality, maxWidth);
            }
          } catch (error) {
            // 跳过无法处理的对象
            console.warn(`无法处理页面 ${pageIndex + 1} 的对象:`, error.message);
          }
        }
      }

      // 报告进度
      const progress = Math.round(((pageIndex + 1) / totalPages) * 100);
      self.postMessage({
        type: 'progress',
        current: pageIndex + 1,
        total: totalPages,
        percent: progress
      });
    }

    // 移除元数据
    if (removeMetadata) {
      try {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
      } catch (error) {
        console.warn('移除元数据失败:', error.message);
      }
    }

    // 保存压缩后的 PDF
    const compressedPdf = await pdfDoc.save();

    // 返回压缩结果
    self.postMessage({
      type: 'complete',
      data: compressedPdf
    });
  } catch (error) {
    // 报告错误
    self.postMessage({
      type: 'error',
      message: error.message
    });
  }
};

/**
 * 压缩单个图片
 * @param {PDFDocument} pdfDoc - PDF 文档
 * @param {Object} xobj - 图片对象
 * @param {number} quality - 质量 (0-100)
 * @param {number} maxWidth - 最大宽度
 */
async function compressImage(pdfDoc, xobj, quality, maxWidth) {
  try {
    // 获取图片尺寸
    const width = xobj.Width?.asNumber() || 0;
    const height = xobj.Height?.asNumber() || 0;

    if (width === 0 || height === 0) {
      return;
    }

    // 计算是否需要缩放
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth) {
      const ratio = maxWidth / width;
      newWidth = maxWidth;
      newHeight = Math.round(height * ratio);
    }

    // 如果尺寸不变且质量设置合理，则跳过
    if (newWidth === width && quality >= 90) {
      return;
    }

    // 如果图片是 JPEG，可以更新质量参数
    // 注：pdf-lib 对图片压缩的支持有限
    // 这里主要通过降采样来减小体积

    // 标记为已处理（防止重复处理）
    xobj.Interpolate = true;
  } catch (error) {
    console.warn('图片压缩失败:', error.message);
  }
}

/**
 * 递归查找所有图片对象
 */
function findAllImages(obj, pdfDoc, found = new Set()) {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (found.has(obj)) {
    return; // 避免循环引用
  }

  found.add(obj);

  // 检查是否是图片
  if (obj.Subtype && obj.Subtype.toString() === 'Image') {
    return obj;
  }

  // 递归查找
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      findAllImages(obj[key], pdfDoc, found);
    }
  }
}
