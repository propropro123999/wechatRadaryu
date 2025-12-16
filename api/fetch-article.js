
// Vercel Serverless Function to fetch WeChat article content
// Endpoint: /api/fetch-article?url=...

export default async function handler(request, response) {
  const { url } = request.query;

  // 1. Validation
  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    const targetUrl = new URL(url);
    // Strict domain check for security
    if (targetUrl.hostname !== 'mp.weixin.qq.com') {
      return response.status(400).json({ error: 'Invalid domain. Only mp.weixin.qq.com is allowed.' });
    }
  } catch (e) {
    return response.status(400).json({ error: 'Invalid URL format' });
  }

  // 2. Fetch Content
  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    if (!fetchResponse.ok) {
        return response.status(fetchResponse.status).json({ error: `Failed to fetch: ${fetchResponse.statusText}` });
    }

    const html = await fetchResponse.text();

    // 3. Return HTML directly (client parses it)
    // We add CORS headers to allow the frontend to call this API
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    
    // Return a JSON wrapper or text? Text is easier for full parsing if we just want body,
    // but JSON allows better error handling. Let's return JSON with html field.
    return response.status(200).json({ html });

  } catch (error) {
    console.error('Fetch error:', error);
    return response.status(500).json({ error: 'Internal Server Error fetching article' });
  }
}
