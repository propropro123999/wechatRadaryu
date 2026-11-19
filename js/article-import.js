(function () {
    function articleUrl(value) {
        let url;
        try { url = new URL(value); } catch { throw new Error('请输入有效的微信公众号文章链接'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== 'mp.weixin.qq.com' ||
            url.username || url.password || url.port || !/^\/s(?:\/|$)/.test(url.pathname)) {
            throw new Error('仅支持 mp.weixin.qq.com 的微信公众号文章链接');
        }
        url.protocol = 'https:';
        return url.href;
    }

    function resourceUrl(value, base) {
        try {
            const url = new URL(value, base);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }

    function proxyUrl(value, base) {
        const url = resourceUrl(value, base);
        return url ? new URL('/api/proxy-image?url=' + encodeURIComponent(url), location.origin).href : '';
    }

    function extract(html, source) {
        const url = articleUrl(source);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const content = doc.querySelector('#js_content');
        if (!content) {
            if (/环境异常|完成验证|访问过于频繁|验证码|secitptpage|js_verify|captcha/i.test(doc.body.textContent + html.slice(0, 12000))) {
                throw new Error('微信要求安全验证，服务器无法直接导入。请在微信或浏览器打开原文完成验证后重试，或复制正文粘贴到编辑器');
            }
            throw new Error('未找到微信文章正文，文章可能已删除、不可访问或不支持导入');
        }
        content.querySelectorAll('script, style, link, meta, base, object, embed, form, input, button, textarea, select').forEach(el => el.remove());
        content.querySelectorAll('iframe, video, audio, mp-video, mpvoice, qqmusic, mp-common-video').forEach(el => {
            const placeholder = doc.createElement('p');
            placeholder.textContent = '【视频 / 音频内容，请在微信原文中查看】';
            placeholder.style.cssText = 'padding:12px;border:1px solid #ddd;color:#666;font-size:14px;';
            el.replaceWith(placeholder);
        });

        for (const el of [content, ...content.querySelectorAll('*')]) {
            for (const attr of [...el.attributes]) {
                if (/^on/i.test(attr.name) || ['srcdoc', 'contenteditable', 'autofocus', 'formaction', 'srcset', 'sizes', 'class'].includes(attr.name)) el.removeAttribute(attr.name);
                if (['href', 'xlink:href', 'src', 'action'].includes(attr.name) && !attr.value.startsWith('#')) {
                    const safe = resourceUrl(attr.value, url);
                    if (safe) el.setAttribute(attr.name, safe);
                    else el.removeAttribute(attr.name);
                }
            }
            if (el.style) {
                for (const property of [...el.style]) {
                    const value = el.style.getPropertyValue(property);
                    const nonLocalValue = value.replace(/url\(\s*['"]?#[\w:.-]+['"]?\s*\)/gi, '');
                    if (/(?:url\s*\(|expression\s*\(|javascript:|@import|behavior)/i.test(nonLocalValue) ||
                        ['position', 'z-index', 'animation', 'animation-name', 'transition'].includes(property)) el.style.removeProperty(property);
                }
                if (el.style.visibility === 'hidden' || el.style.visibility === 'collapse') el.style.removeProperty('visibility');
                if (el.style.opacity && Number(el.style.opacity) === 0) el.style.removeProperty('opacity');
            }
            if (el.localName === 'a') {
                el.removeAttribute('target');
                el.setAttribute('rel', 'noopener noreferrer');
            }
        }
        content.querySelectorAll('foreignObject, animate, animateMotion, animateTransform, set').forEach(el => el.remove());
        content.querySelectorAll('use').forEach(el => {
            const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
            if (!href.startsWith('#')) el.remove();
        });
        content.querySelectorAll('svg').forEach(svg => {
            svg.style.maxWidth = '100%';
        });
        content.querySelectorAll('img, image').forEach(img => {
            const raw = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('xlink:href');
            const src = proxyUrl(raw || '', url);
            if (!raw || !src) { img.remove(); return; }
            if (img.localName === 'image') {
                img.setAttribute('href', src);
                img.removeAttribute('xlink:href');
            } else {
                img.setAttribute('src', src);
                img.setAttribute('referrerpolicy', 'no-referrer');
                const width = img.style.width;
                if (/^\d+(?:\.\d+)?px$/.test(width)) img.setAttribute('width', parseFloat(width));
                else if (/^\d+(?:\.\d+)?%$/.test(width)) img.setAttribute('width', width);
                img.removeAttribute('height');
                img.style.setProperty('max-width', '100%', 'important');
                img.style.setProperty('height', 'auto', 'important');
            }
            ['data-src', 'data-original', 'loading', 'hidden'].forEach(attr => img.removeAttribute(attr));
        });
        if (!content.textContent.trim() && !content.querySelector('img, svg')) throw new Error('微信文章正文为空');

        const wrapper = doc.createElement('section');
        wrapper.className = 'wechat-article';
        wrapper.style.cssText = 'max-width:578px;margin:0 auto;overflow-wrap:break-word;font-size:16px;line-height:1.6;color:#333;';
        const title = doc.querySelector('#activity-name')?.textContent.trim() || doc.querySelector('meta[property="og:title"]')?.content || '';
        const author = doc.querySelector('#js_name')?.textContent.trim() || doc.querySelector('#meta_content .rich_media_meta_text')?.textContent.trim() || '';
        if (title) {
            const heading = doc.createElement('h1');
            heading.textContent = title;
            heading.style.cssText = 'font-size:22px;line-height:1.4;font-weight:600;margin:0 0 14px;';
            wrapper.append(heading);
        }
        if (author) {
            const byline = doc.createElement('p');
            byline.textContent = author;
            byline.style.cssText = 'font-size:14px;color:#777;margin:0 0 24px;';
            wrapper.append(byline);
        }
        content.removeAttribute('id');
        wrapper.append(content);
        return {html: wrapper.outerHTML, title, author, images: wrapper.querySelectorAll('img, image').length};
    }

    window.WeChatArticle = {articleUrl, extract};
})();
