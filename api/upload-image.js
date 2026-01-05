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

        // Convert Base64 to Buffer
        const base64Data = image.split(';base64,').pop();
        const buffer = Buffer.from(base64Data, 'base64');
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

        // Telegra.ph expects "file" field
        const preContent = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
        const postContent = `\r\n--${boundary}--\r\n`;

        const bodyBuffer = Buffer.concat([
            Buffer.from(preContent, 'utf8'),
            buffer,
            Buffer.from(postContent, 'utf8')
        ]);

        const options = {
            hostname: 'telegra.ph',
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length
            }
        };

        const uploadReq = https.request(options, (upstreamRes) => {
            let data = '';
            upstreamRes.on('data', (chunk) => data += chunk);
            upstreamRes.on('end', () => {
                try {
                    // Telegra.ph returns: [{"src":"/file/xxxx.jpg"}]
                    const result = JSON.parse(data);

                    if (Array.isArray(result) && result[0].src) {
                        res.status(200).json({ url: 'https://telegra.ph' + result[0].src });
                    } else if (result.error) {
                        res.status(500).json({ error: result.error });
                    } else {
                        res.status(500).json({ error: 'Unknown response from Telegra.ph', raw: data });
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
