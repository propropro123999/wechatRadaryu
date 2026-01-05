const https = require('https');

// HARDCODED TOKEN as requested
const USER_TOKEN = 'dcone2025';

module.exports = (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // --- HANDLE UPLOAD (POST) ---
    if (req.method === 'POST') {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        // Detect MIME type
        // image string format: "data:image/png;base64,....."
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 string' });
        }
        const mimeType = matches[1]; // e.g., 'image/png'
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Determine filename extension
        const ext = mimeType.split('/')[1] || 'jpg';
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

        const uploadReq = https.request(options, (upstreamRes) => {
            let data = '';
            upstreamRes.on('data', (chunk) => data += chunk);
            upstreamRes.on('end', () => {
                try {
                    // Catbox returns the raw URL as text body on success
                    const text = data.trim();
                    console.log('Catbox response:', text);

                    if (text.startsWith('http')) {
                        res.status(200).json({ url: text });
                    } else {
                        res.status(500).json({ error: 'Upload failed', raw: text });
                    }
                } catch (e) {
                    res.status(500).json({ error: e.message, raw: data });
                }
            });
        });

        uploadReq.on('error', (e) => res.status(500).json({ error: e.message }));
        uploadReq.write(bodyBuffer);
        uploadReq.end();
        return;
    }

    res.status(405).json({ error: 'Method Not Allowed' });
};
