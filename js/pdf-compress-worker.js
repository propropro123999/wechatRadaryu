importScripts('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');

self.onmessage = async ({ data: { pdfData, quality, maxWidth, removeMetadata } }) => {
  try {
    const { PDFDocument, PDFRawStream, PDFName, PDFArray } = self.PDFLib;
    const doc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const images = doc.context.enumerateIndirectObjects().filter(([, object]) =>
      object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'));
    const masks = new Set(images.flatMap(([, image]) => ['SMask', 'Mask']
      .map(key => image.dict.lookup(PDFName.of(key))).filter(object => object instanceof PDFRawStream)));
    let optimized = 0;
    let skipped = 0;
    for (let index = 0; index < images.length; index++) {
      const [ref, image] = images[index];
      const value = key => image.dict.lookup(PDFName.of(key));
      let bitmap;
      try {
        // Chrome、Word 等导出的照片多为带 RGB ICC 配置的 JPEG：像素值原样重编码并沿用原配置，颜色不变。
        const space = value('ColorSpace');
        const profile = space instanceof PDFArray && String(space.lookup(0)) === '/ICCBased' ? space.lookup(1) : null;
        const iccRgb = profile instanceof PDFRawStream && profile.dict.lookup(PDFName.of('N'))?.asNumber?.() === 3;
        // Other encodings, masks and custom decode arrays must keep their original decoder.
        if (masks.has(image) || String(value('Filter')) !== '/DCTDecode' ||
            !(iccRgb || ['/DeviceRGB', '/DeviceGray'].includes(String(space))) ||
            ['SMask', 'Mask', 'Decode', 'DecodeParms'].some(key => image.dict.has(PDFName.of(key)))) {
          skipped++;
          continue;
        }
        const width = value('Width').asNumber();
        const height = value('Height').asNumber();
        if (width * height > 40000000 || width < 1 || height < 1 ||
            typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
          skipped++;
          continue;
        }
        const original = image.getContents();
        bitmap = await createImageBitmap(new Blob([original], { type: 'image/jpeg' }), { imageOrientation: 'none', colorSpaceConversion: 'none' });
        if (bitmap.width !== width || bitmap.height !== height) { skipped++; continue; }
        const ratio = Math.min(1, maxWidth / width);
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 });
        if (blob.size < original.byteLength) {
          const replacement = doc.context.stream(new Uint8Array(await blob.arrayBuffer()), {
            Type: 'XObject', Subtype: 'Image', Width: canvas.width, Height: canvas.height,
            BitsPerComponent: 8, Filter: 'DCTDecode', ...(iccRgb ? {} : { ColorSpace: 'DeviceRGB' })
          });
          for (const [key, value] of image.dict.entries()) {
            if (!replacement.dict.has(key) && key !== PDFName.of('Length')) replacement.dict.set(key, value);
          }
          doc.context.assign(ref, replacement);
          optimized++;
        }
        canvas.width = canvas.height = 1;
      } catch (_) { skipped++; }
      finally {
        bitmap?.close();
        self.postMessage({ type: 'progress', current: index + 1, total: images.length,
          percent: Math.round(((index + 1) / Math.max(1, images.length)) * 90) });
      }
    }
    if (removeMetadata) {
      for (const key of ['Title', 'Author', 'Subject', 'Producer', 'Creator']) doc['set' + key]('');
      doc.setKeywords([]);
      doc.catalog.delete(PDFName.of('Metadata'));
      const info = doc.context.lookup(doc.context.trailerInfo.Info);
      info?.delete(PDFName.of('CreationDate'));
      info?.delete(PDFName.of('ModDate'));
    }
    const candidate = await doc.save();
    const unchanged = candidate.byteLength >= pdfData.byteLength;
    const data = unchanged ? pdfData : candidate;
    self.postMessage({ type: 'complete', data, optimized: unchanged ? 0 : optimized, skipped, unchanged }, [data.buffer]);
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
