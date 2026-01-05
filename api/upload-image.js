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

    // --- HANDLE DELETE ---
    if (req.method === 'DELETE') {
        const { url } = req.body; // Expect JSON body { "url": "..." }
        if (!url) return res.status(400).json({ error: 'No URL provided' });

        // Extract path from URL (e.g., https://i.111666.best/image/abc.jpg -> /image/abc.jpg)
        // Adjust based on API docs: "curl -XDELETE https://i.111666.best/image/IMAGE-PATH"
        // If the stored URL is full, we need to parse it.
        let imagePath = url.replace('https://i.111666.best', '');

        const options = {
            hostname: 'i.111666.best',
            path: imagePath,
            method: 'DELETE',
            headers: {
                'Auth-Token': USER_TOKEN
            }
        };

        const deleteReq = https.request(options, (upstreamRes) => {
            // Just pass through status
            res.status(upstreamRes.statusCode).json({ success: upstreamRes.statusCode < 300 });
        });

        deleteReq.on('error', (e) => res.status(500).json({ error: e.message }));
        deleteReq.end();
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

        // Construct Multipart Body
        // API expects field "image"
        const preContent = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
        const postContent = `\r\n--${boundary}--\r\n`;

        const bodyBuffer = Buffer.concat([
            Buffer.from(preContent, 'utf8'),
            buffer,
            Buffer.from(postContent, 'utf8')
        ]);

        const options = {
            hostname: 'i.111666.best',
            path: '/image',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length,
                'Auth-Token': USER_TOKEN
            }
        };

        const uploadReq = https.request(options, (upstreamRes) => {
            let data = '';
            upstreamRes.on('data', (chunk) => data += chunk);
            upstreamRes.on('end', () => {
                try {
                    // API returns: https://i.111666.best/image/xxxxx
                    // Or JSON? The user example shows raw URL return or maybe text.
                    // Assuming text body is the URL based on curl usage, but curl -F often implies JSON or text.
                    // Let's assume the response body IS the URL or a JSON containing it.
                    // Looking at common 111666 instances (often GoImg), it might return JSON.
                    // But if curl output is simple, maybe it's just the URL string.
                    // Let's try to parse as JSON, if fail, assume text.

                    const text = data.trim();
                    if (text.startsWith('http')) {
                        res.status(200).json({ url: text });
                    } else {
                        try {
                            const json = JSON.parse(text);
                            // Adjust key based on actual API. Often 'url' or 'data.url'
                            const finalUrl = json.url || json.data?.url || text;
                            res.status(200).json({ url: finalUrl });
                        } catch (e) {
                            // If not JSON and not http, maybe error
                            console.warn('Unknown response:', text);
                            res.status(200).json({ url: text }); // Try returning raw anyway
                        }
                    }
                } catch (e) {
                    res.status(500).json({ error: e.message });
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
