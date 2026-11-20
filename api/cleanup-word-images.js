import { timingSafeEqual } from 'node:crypto';
import { list, del } from '@vercel/blob';
import { WORD_IMAGE_PREFIX, WORD_IMAGE_RETENTION_MS, isWordImagePath } from '../lib/word-images.js';

export function createCleanupHandler({ listBlobs = list, deleteBlobs = del, env = process.env, now = Date.now } = {}) {
    return async function handler(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        if (req.method !== 'GET') {
            res.setHeader('Allow', 'GET');
            return res.status(405).json({ error: 'Method Not Allowed' });
        }
        const expected = Buffer.from(`Bearer ${env.CRON_SECRET || ''}`);
        const actual = Buffer.from(req.headers.authorization || '');
        if (!env.CRON_SECRET || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Vercel Blob 尚未配置' });
        const cutoff = now() - WORD_IMAGE_RETENTION_MS;
        const dryRun = req.query?.dryRun === '1';
        const options = { token: env.BLOB_READ_WRITE_TOKEN, abortSignal: AbortSignal.timeout(50000) };
        let cursor;
        let scanned = 0;
        let eligible = 0;
        let deleted = 0;
        try {
            do {
                const page = await listBlobs({ ...options, prefix: WORD_IMAGE_PREFIX, limit: 1000, cursor });
                scanned += page.blobs.length;
                const expired = page.blobs.filter(blob => isWordImagePath(blob.pathname) && new Date(blob.uploadedAt).getTime() < cutoff);
                eligible += expired.length;
                if (!dryRun) {
                    for (let i = 0; i < expired.length; i += 250) {
                        const batch = expired.slice(i, i + 250);
                        await deleteBlobs(batch.map(blob => blob.url), options);
                        deleted += batch.length;
                    }
                }
                if (!page.hasMore) break;
                if (!page.cursor || page.cursor === cursor) throw new Error('Invalid pagination cursor');
                cursor = page.cursor;
            } while (true);
            return res.status(200).json({ dryRun, scanned, eligible, deleted });
        } catch {
            return res.status(502).json({ error: '图片清理未完成，请检查 Blob 配置并重试', scanned, eligible, deleted });
        }
    };
}

export default createCleanupHandler();
