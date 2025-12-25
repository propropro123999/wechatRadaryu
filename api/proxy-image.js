
// Vercel Serverless Function to proxy WeChat images preventing hotlinking
// Endpoint: /api/proxy-image?url=...

export default async function handler(request, response) {
    const { url } = request.query;

    if (!url) {
        return response.status(400).json({ error: 'Missing "url" parameter' });
    }

    try {
        const targetUrl = new URL(url);
        // Allow WeChat image domains
        const allowedDomains = ['.qpic.cn', '.qq.com', 'mmbiz.qpic.cn'];
        const isAllowed = allowedDomains.some(domain => targetUrl.hostname.endsWith(domain));

        if (!isAllowed) {
            return response.status(403).json({ error: 'Forbidden domain' });
        }

        // Fetch image with headers that mimic a browser request but bypass Referer checks
        const imageResponse = await fetch(url, {
            headers: {
                // WeChat servers often check Referer. Sending empty or wechat domain usually works.
                'Referer': 'https://mp.weixin.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
        });

        if (!imageResponse.ok) {
            return response.status(imageResponse.status).send(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        // Forward the Content-Type (important for browser to render image)
        const contentType = imageResponse.headers.get('content-type');
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }

        // Cache control for performance
        response.setHeader('Cache-Control', 'public, max-age=86400');

        // CORS headers to allow usage in our frontend
        response.setHeader('Access-Control-Allow-Origin', '*');

        // Get buffer and send
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        response.status(200).send(buffer);

    } catch (error) {
        console.error('Proxy error:', error);
        response.status(500).json({ error: 'Internal Server Error' });
    }
}
