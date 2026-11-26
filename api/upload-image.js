import https from 'node:https';

const MAX_DATA_URL_LENGTH = 4 * 1024 * 1024;
const MAX_DECODED_BYTES = 3 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 25000;
const ALLOWED_MIME_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp'
};

function isSameOrigin(req) {
    const host = req.headers?.host;
    if (!host) return false;
    if (req.headers['sec-fetch-site'] === 'same-origin') return true;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const expectedOrigin = `${protocol}://${host}`;
    return ['origin', 'referer'].some(name => {
        try { return new URL(req.headers[name]).origin === expectedOrigin; } catch { return false; }
    });
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        if (!isSameOrigin(req)) return res.status(403).json({ error: '仅允许同源请求' });
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!isSameOrigin(req)) {
        return res.status(403).json({ error: '仅允许同源请求' });
    }

    const image = req.body?.image;
    if (typeof image !== 'string' || !image) {
        return res.status(400).json({ error: '未提供图片数据' });
    }
    if (image.length > MAX_DATA_URL_LENGTH) {
        return res.status(413).json({ error: '图片过大，请先缩小图片后重试' });
    }

    const matches = image.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!matches) {
        return res.status(400).json({ error: '仅支持 PNG、JPG、GIF 或 WebP 图片的 Base64 数据' });
    }

    const rawMime = matches[1].toLowerCase();
    const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    const ext = ALLOWED_MIME_EXT[rawMime];
    const buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length) {
        return res.status(400).json({ error: '图片数据为空' });
    }
    if (buffer.length > MAX_DECODED_BYTES) {
        return res.status(413).json({ error: '图片过大，请先缩小图片后重试' });
    }

    const filename = `upload.${ext}`;
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    // Catbox API: reqtype=fileupload, fileToUpload=@file
    const fieldPart = `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n`;
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const postFooter = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
        Buffer.from(fieldPart, 'utf8'),
        Buffer.from(fileHeader, 'utf8'),
        buffer,
        Buffer.from(postFooter, 'utf8')
    ]);

    const options = {
        hostname: 'catbox.moe',
        path: '/user/api.php',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': bodyBuffer.length,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        }
    };

    try {
        const text = await new Promise((resolve, reject) => {
            const uploadReq = https.request(options, (upstreamRes) => {
                let data = '';
                upstreamRes.on('data', (chunk) => {
                    if (data.length < 4096) data += chunk;
                });
                upstreamRes.on('error', reject);
                upstreamRes.on('end', () => resolve(data.trim()));
            });
            const timer = setTimeout(() => {
                const err = new Error('图床上传超时，请稍后重试');
                err.code = 'UPSTREAM_TIMEOUT';
                uploadReq.destroy(err);
            }, UPSTREAM_TIMEOUT_MS);
            uploadReq.on('close', () => clearTimeout(timer));
            uploadReq.on('error', reject);
            uploadReq.write(bodyBuffer);
            uploadReq.end();
        });

        let parsedUrl;
        try {
            parsedUrl = new URL(text);
        } catch {
            parsedUrl = null;
        }
        if (parsedUrl && parsedUrl.protocol === 'https:' &&
            (parsedUrl.hostname === 'catbox.moe' || parsedUrl.hostname.endsWith('.catbox.moe'))) {
            return res.status(200).json({ url: parsedUrl.href });
        }
        return res.status(502).json({ error: '图床上传失败，请稍后重试' });
    } catch (error) {
        if (error?.code === 'UPSTREAM_TIMEOUT') {
            return res.status(504).json({ error: '图床上传超时，请稍后重试' });
        }
        return res.status(502).json({ error: '图床连接失败，请稍后重试' });
    }
}
