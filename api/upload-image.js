import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { MAX_WORD_IMAGE_BYTES, WORD_IMAGE_PREFIX, imageType } from '../lib/word-images.js';

export function createUploadHandler({ putBlob = put, env = process.env } = {}) {
    return async function handler(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ error: 'Method Not Allowed' });
        }
        const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
        if (req.headers.origin !== origin) return res.status(403).json({ error: '仅允许同源上传' });
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
            return res.status(415).json({ error: '请使用 JSON 格式上传图片' });
        }
        const image = req.body?.image;
        if (typeof image !== 'string') return res.status(400).json({ error: '未提供有效图片' });
        if (image.length > Math.ceil(MAX_WORD_IMAGE_BYTES / 3) * 4 + 64) {
            return res.status(413).json({ error: '单张图片不能超过 3 MB' });
        }
        const match = image.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match) return res.status(400).json({ error: '仅支持 PNG、JPEG、GIF、WebP 图片' });
        const buffer = Buffer.from(match[2], 'base64');
        const type = imageType(buffer);
        if (buffer.toString('base64') !== match[2] || !type || type.mime !== match[1]) {
            return res.status(400).json({ error: '图片格式或内容无效' });
        }
        if (buffer.length > MAX_WORD_IMAGE_BYTES) return res.status(413).json({ error: '单张图片不能超过 3 MB' });
        if (!env.BLOB_READ_WRITE_TOKEN || !env.CRON_SECRET) {
            return res.status(503).json({ error: '图片暂存尚未启用，请先配置 Vercel Blob 和 CRON_SECRET' });
        }
        const environment = ['production', 'preview'].includes(env.VERCEL_ENV) ? env.VERCEL_ENV : 'development';
        try {
            const blob = await putBlob(`${WORD_IMAGE_PREFIX}${environment}/${randomUUID()}.${type.extension}`, buffer, {
                access: 'public',
                addRandomSuffix: false,
                contentType: type.mime,
                cacheControlMaxAge: 60,
                token: env.BLOB_READ_WRITE_TOKEN,
                abortSignal: AbortSignal.timeout(15000)
            });
            return res.status(200).json({ url: blob.url });
        } catch {
            return res.status(502).json({ error: '图片暂存失败，请检查 Vercel Blob 配置或稍后重试' });
        }
    };
}

export default createUploadHandler();
