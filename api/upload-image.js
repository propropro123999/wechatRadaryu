const https = require('https');

// Form boundary for multipart upload
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. Get Base64 image from request body
    const { image } = req.body;
    if (!image) {
        return res.status(400).json({ error: 'No image provided' });
    }

    // 2. Convert Base64 to Buffer
    // Image comes as "data:image/png;base64,..."
    const base64Data = image.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Construct Multipart Body
    // Telegraph expects a field named "file"
    const filename = 'upload.jpg';
    const contentType = 'image/jpeg';

    const preContent = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    const postContent = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
        Buffer.from(preContent, 'utf8'),
        buffer,
        Buffer.from(postContent, 'utf8')
    ]);

    // 4. Send to Telegraph
    const options = {
        hostname: 'telegra.ph',
        path: '/upload',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': bodyBuffer.length
        }
    };

    const upstreamReq = https.request(options, (upstreamRes) => {
        let data = '';

        upstreamRes.on('data', (chunk) => {
            data += chunk;
        });

        upstreamRes.on('end', () => {
            try {
                // Telegraph returns array: [{"src":"\/file\/..."}]
                const json = JSON.parse(data);
                if (Array.isArray(json) && json[0] && json[0].src) {
                    const fullUrl = 'https://telegra.ph' + json[0].src;
                    res.status(200).json({ url: fullUrl });
                } else if (json.error) {
                    res.status(500).json({ error: json.error });
                } else {
                    res.status(500).json({ error: 'Unknown upstream response', raw: data });
                }
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse upstream response', details: e.message, raw: data });
            }
        });
    });

    upstreamReq.on('error', (e) => {
        console.error(e);
        res.status(500).json({ error: 'Upstream request failed', details: e.message });
    });

    upstreamReq.write(bodyBuffer);
    upstreamReq.end();
};
