importScripts('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');

self.onmessage = async ({ data: { pdfData, quality, maxWidth, removeMetadata } }) => {
  try {
    const { PDFDocument, PDFRawStream, PDFName } = self.PDFLib;
    const doc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const images = doc.context.enumerateIndirectObjects().filter(([, object]) =>
      object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'));
    let optimized = 0;
    let skipped = 0;
    for (let index = 0; index < images.length; index++) {
      const [ref, image] = images[index];
      const value = key => image.dict.lookup(PDFName.of(key));
      let bitmap;
      try {
        // Other encodings, masks and custom decode arrays must keep their original decoder.
        if (String(value('Filter')) !== '/DCTDecode' ||
            !['/DeviceRGB', '/DeviceGray'].includes(String(value('ColorSpace'))) ||
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
        bitmap = await createImageBitmap(new Blob([original], { type: 'image/jpeg' }), { imageOrientation: 'none' });
        if (bitmap.width !== width || bitmap.height !== height) { skipped++; continue; }
        const ratio = Math.min(1, maxWidth / width);
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 });
        if (blob.size < original.byteLength) {
          doc.context.assign(ref, doc.context.stream(new Uint8Array(await blob.arrayBuffer()), {
            Type: 'XObject', Subtype: 'Image', Width: canvas.width, Height: canvas.height,
            ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode'
          }));
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
