
// Vercel Serverless Function to fetch WeChat article content
// Endpoint: /api/fetch-article?url=...

export default async function handler(request, response) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const origin = `${protocol}://${request.headers.host}`;
  const sameOrigin = request.headers['sec-fetch-site'] === 'same-origin' || ['origin', 'referer'].some(name => {
    try { return new URL(request.headers[name]).origin === origin; } catch { return false; }
  });
  if (!sameOrigin) return response.status(403).json({error: '仅允许同源请求'});
  let url;
  try {
    if (typeof request.query.url !== 'string') throw new Error();
    url = new URL(request.query.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname !== 'mp.weixin.qq.com' ||
        url.username || url.password || url.port || !/^\/s(?:\/|$)/.test(url.pathname)) throw new Error();
    url.protocol = 'https:';
  } catch {
    return response.status(400).json({error: '请输入有效的微信公众号文章链接（mp.weixin.qq.com/s/…）'});
  }

  // 2. Fetch Content
  try {
    const fetchResponse = await fetch(url.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    if (!fetchResponse.ok) {
        return response.status(502).json({error: '微信暂时无法返回文章，请打开原文确认链接有效后重试'});
    }

    const html = await fetchResponse.text();

    if (!/id\s*=\s*["']js_content["']/i.test(html)) {
      const verification = /环境异常|完成验证|访问过于频繁|验证码|secitptpage|js_verify|captcha/i.test(html);
      return response.status(422).json({error: verification
        ? '微信要求安全验证，服务器无法直接导入。请在微信或浏览器打开原文完成验证后重试，或复制正文粘贴到编辑器'
        : '未找到微信文章正文，文章可能已删除、不可访问或不支持导入'});
    }
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({html: html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')});

  } catch (error) {
    return response.status(502).json({error: error.name === 'TimeoutError'
      ? '获取微信文章超时，请稍后重试或复制正文粘贴到编辑器'
      : '获取微信文章失败，请稍后重试或复制正文粘贴到编辑器'});
  }
}
