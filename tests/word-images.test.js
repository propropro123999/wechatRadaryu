import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createUploadHandler } from '../api/upload-image.js';
import { createCleanupHandler } from '../api/cleanup-word-images.js';
import { MAX_WORD_IMAGE_BYTES, WORD_IMAGE_PREFIX, WORD_IMAGE_RETENTION_MS, imageType } from '../lib/word-images.js';

const env = { BLOB_READ_WRITE_TOKEN: 'test-blob-token', CRON_SECRET: 'unit-test-cron-secret-not-for-production', VERCEL_ENV: 'preview' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV5kAAAAASUVORK5CYII=', 'base64');
const image = `data:image/png;base64,${png.toString('base64')}`;
const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; }, setHeader(name, value) { this.headers[name] = value; } });
async function call(handler, overrides = {}) {
    const res = response();
    await handler({ method: 'POST', headers: { host: 'tools.example', origin: 'https://tools.example', 'content-type': 'application/json' }, body: { image }, ...overrides }, res);
    return res;
}
const date = Date.parse('2026-11-20T03:00:00Z');
const cutoff = date - WORD_IMAGE_RETENTION_MS;
const path = (id, environment = 'production') => `${WORD_IMAGE_PREFIX}${environment}/${String(id).padStart(8, '0')}-0000-4000-8000-000000000000.png`;
const blob = (id, uploadedAt, environment) => ({ pathname: path(id, environment), url: `https://unit.public.blob.vercel-storage.com/${path(id, environment)}`, uploadedAt: new Date(uploadedAt) });
const cleanupRequest = { method: 'GET', headers: { authorization: `Bearer ${env.CRON_SECRET}` } };

test('upload writes only validated image bytes to random Blob paths without exposing credentials', async () => {
    const writes = [];
    const handler = createUploadHandler({ env, putBlob: async (...args) => {
        writes.push(args);
        return { url: `https://unit.public.blob.vercel-storage.com/${args[0]}` };
    } });
    const result = await call(handler);
    assert.equal(result.code, 200);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    assert.match(writes[0][0], /^word-images\/preview\/[0-9a-f-]{36}\.png$/);
    assert.deepEqual(writes[0][1], png);
    assert.equal(writes[0][2].access, 'public');
    assert.equal(writes[0][2].contentType, 'image/png');
    assert.equal(writes[0][2].cacheControlMaxAge, 60);
    assert.equal(writes[0][2].addRandomSuffix, false);
    assert.equal(writes[0][2].token, env.BLOB_READ_WRITE_TOKEN);
    assert(writes[0][2].abortSignal instanceof AbortSignal);
    assert.deepEqual(Object.keys(result.data), ['url']);
    await call(handler);
    assert.notEqual(writes[0][0], writes[1][0]);
    for (const environment of ['production', 'unexpected']) {
        await call(createUploadHandler({ env: { ...env, VERCEL_ENV: environment }, putBlob: async pathname => {
            assert(pathname.startsWith(`word-images/${environment === 'production' ? 'production' : 'development'}/`));
            return { url: 'https://unit.public.blob.vercel-storage.com/test' };
        } }));
    }
});

test('upload rejects cross-origin, wrong method/content type, malformed or unsupported images before storage', async () => {
    let writes = 0;
    const handler = createUploadHandler({ env, putBlob: async () => { writes++; throw new Error('unexpected'); } });
    assert.equal((await call(handler, { method: 'GET' })).code, 405);
    assert.equal((await call(handler, { method: 'OPTIONS' })).code, 405);
    for (const origin of [undefined, 'https://other.example', 'https://tools.example.evil']) {
        assert.equal((await call(handler, { headers: { host: 'tools.example', origin } })).code, 403);
    }
    assert.equal((await call(handler, { headers: { host: 'tools.example', origin: 'https://tools.example', 'content-type': 'text/plain' } })).code, 415);
    for (const invalid of [undefined, null, 1, {}, '', 'not an image', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:text/html;base64,PHNjcmlwdD4=', image.replace('image/png', 'image/jpeg'), 'data:image/png;base64,AAAA=', image + '!', 'data:image/png;base64,' + Buffer.from('<script>not an image</script>').toString('base64')]) {
        assert.equal((await call(handler, { body: { image: invalid } })).code, 400, String(invalid));
    }
    assert.equal((await call(handler, { body: null })).code, 400);
    assert.equal((await call(handler, { body: { image: 'data:image/png;base64,' + 'A'.repeat(MAX_WORD_IMAGE_BYTES * 2) } })).code, 413);
    assert.equal(writes, 0);
});

test('supported file signatures are identified and real byte size is enforced', async () => {
    assert.equal(imageType(png).mime, 'image/png');
    assert.equal(imageType(Buffer.from([255, 216, 255, ...new Array(10).fill(0)])).mime, 'image/jpeg');
    assert.equal(imageType(Buffer.from('GIF89a' + '\0'.repeat(10))).mime, 'image/gif');
    assert.equal(imageType(Buffer.from('RIFF0000WEBPxxxx')).mime, 'image/webp');
    assert.equal(imageType(Buffer.from('short')), null);
    let writes = 0;
    const handler = createUploadHandler({ env, putBlob: async () => { writes++; return { url: 'ok' }; } });
    const buffer = Buffer.alloc(MAX_WORD_IMAGE_BYTES + 1);
    png.copy(buffer);
    assert.equal((await call(handler, { body: { image: `data:image/png;base64,${buffer.toString('base64')}` } })).code, 413);
    const exact = buffer.subarray(0, MAX_WORD_IMAGE_BYTES);
    assert.equal((await call(handler, { body: { image: `data:image/png;base64,${exact.toString('base64')}` } })).code, 200);
    assert.equal(writes, 1);
});

test('missing Blob or cleanup configuration fails closed; provider failures do not leak secrets', async () => {
    for (const missing of ['BLOB_READ_WRITE_TOKEN', 'CRON_SECRET']) {
        const handler = createUploadHandler({ env: { ...env, [missing]: '' }, putBlob: async () => { throw new Error('must not run'); } });
        assert.equal((await call(handler)).code, 503);
    }
    const handler = createUploadHandler({ env, putBlob: async () => { throw new Error(env.BLOB_READ_WRITE_TOKEN); } });
    const result = await call(handler);
    assert.equal(result.code, 502);
    assert(!JSON.stringify(result.data).includes(env.BLOB_READ_WRITE_TOKEN));
});

test('cleanup requires GET and the configured Cron secret before listing or deleting', async () => {
    let reads = 0;
    const dependencies = { env, listBlobs: async () => { reads++; throw new Error('must not run'); } };
    const handler = createCleanupHandler(dependencies);
    assert.equal((await call(handler)).code, 405);
    for (const authorization of [undefined, '', 'Bearer wrong', `Bearer ${'x'.repeat(env.CRON_SECRET.length)}`]) {
        assert.equal((await call(handler, { method: 'GET', headers: { authorization } })).code, 401);
    }
    assert.equal((await call(createCleanupHandler({ ...dependencies, env: { ...env, CRON_SECRET: '' } }), cleanupRequest)).code, 401);
    assert.equal((await call(createCleanupHandler({ ...dependencies, env: { ...env, BLOB_READ_WRITE_TOKEN: '' } }), cleanupRequest)).code, 503);
    assert.equal(reads, 0);
});

test('cleanup walks pages, deletes only old Word images in every environment, and supports repeat runs', async () => {
    const removed = [];
    const reads = [];
    let entries = [blob(1, cutoff - 1), blob(2, cutoff), blob(3, date), blob(4, cutoff - 86400000, 'preview'), blob(5, cutoff - 1000, 'development'),
        { ...blob(6, 0), pathname: 'other-app/logo.png' }, { ...blob(7, 0), pathname: 'word-images/production/keep-me.png' },
        { ...blob(8, 0), pathname: 'word-images/../other-app/logo.png' }, { ...blob(9, 0), uploadedAt: 'invalid' }];
    const handler = createCleanupHandler({ env, now: () => date, listBlobs: async options => {
        assert.equal(options.prefix, 'word-images/');
        assert.equal(options.token, env.BLOB_READ_WRITE_TOKEN);
        reads.push(options.cursor);
        return options.cursor ? { blobs: entries.slice(3), hasMore: false } : { blobs: entries.slice(0, 3), hasMore: true, cursor: 'page2' };
    }, deleteBlobs: async (urls, options) => {
        assert.equal(options.token, env.BLOB_READ_WRITE_TOKEN);
        removed.push(...urls);
    } });
    const result = await call(handler, cleanupRequest);
    assert.equal(result.code, 200);
    assert.deepEqual(result.data, { dryRun: false, scanned: 9, eligible: 3, deleted: 3 });
    assert.deepEqual(reads, [undefined, 'page2']);
    assert.deepEqual(removed, [entries[0].url, entries[3].url, entries[4].url]);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert(!JSON.stringify(result.data).includes('https://'));
    entries = entries.filter(entry => !removed.includes(entry.url));
    assert.equal((await call(handler, cleanupRequest)).data.deleted, 0);
});

test('dry-run previews candidates without deleting and deletion batches stay bounded', async () => {
    const batches = [];
    const handler = createCleanupHandler({ env, now: () => date,
        listBlobs: async () => ({ blobs: Array.from({ length: 501 }, (_, id) => blob(id, cutoff - 1)), hasMore: false }),
        deleteBlobs: async urls => batches.push(urls.length) });
    const dryRun = await call(handler, { ...cleanupRequest, query: { dryRun: '1' } });
    assert.deepEqual(dryRun.data, { dryRun: true, scanned: 501, eligible: 501, deleted: 0 });
    assert.deepEqual(batches, []);
    assert.equal((await call(handler, cleanupRequest)).data.deleted, 501);
    assert.deepEqual(batches, [250, 250, 1]);
});

test('cleanup reports failed listing/deletion and refuses a missing or stuck cursor', async () => {
    for (const listBlobs of [async () => { throw new Error(env.BLOB_READ_WRITE_TOKEN); }, async () => ({ blobs: [], hasMore: true }), async () => ({ blobs: [], hasMore: true, cursor: 'stuck' })]) {
        const handler = createCleanupHandler({ env, listBlobs, now: () => date });
        const result = await call(handler, cleanupRequest);
        assert.equal(result.code, 502);
        assert(!JSON.stringify(result.data).includes(env.BLOB_READ_WRITE_TOKEN));
    }
    const handler = createCleanupHandler({ env, now: () => date, listBlobs: async () => ({ blobs: [blob(1, 0)], hasMore: false }), deleteBlobs: async () => { throw new Error('provider unavailable'); } });
    assert.equal((await call(handler, cleanupRequest)).code, 502);
    const empty = createCleanupHandler({ env, listBlobs: async () => ({ blobs: [], hasMore: false }) });
    assert.equal((await call(empty, cleanupRequest)).data.deleted, 0);
});

test('daily UTC cron is registered and no Catbox upload fallback remains', () => {
    const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    assert.deepEqual(config.crons, [{ path: '/api/cleanup-word-images', schedule: '0 3 * * *' }]);
    assert.equal(config.functions['api/cleanup-word-images.js'].maxDuration, 60);
    for (const file of ['../api/upload-image.js', '../word-to-html.html']) {
        assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /catbox|telegra\.ph/i);
    }
});
