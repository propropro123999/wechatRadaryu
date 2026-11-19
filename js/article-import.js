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

    function svgLabels(content) {
        const ns = 'http://www.w3.org/2000/svg';
        const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const canvas = document.createElement('canvas').getContext('2d');
        function length(value, reference, fontSize) {
            const number = parseFloat(value);
            if (!Number.isFinite(number)) return null;
            if (value.endsWith('%')) return number * reference / 100;
            if (value.endsWith('rem')) return number * rootSize;
            if (value.endsWith('em')) return number * fontSize;
            if (value.endsWith('pt')) return number * 4 / 3;
            return number;
        }
        function fontSizeOf(node) {
            if (!node) return rootSize;
            const parentSize = fontSizeOf(node.parentElement);
            return length(node.style?.fontSize || node.getAttribute('font-size') || '', parentSize, parentSize) ?? parentSize;
        }
        function viewport(svg) {
            if (!svg) return {width: 578, height: 150};
            const box = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
            if (box.length === 4 && box.every(Number.isFinite)) return {width: box[2], height: box[3]};
            const parent = viewport(svg.parentElement?.closest('svg'));
            return {width: length(svg.getAttribute('width') || '', parent.width, fontSizeOf(svg)) ?? parent.width,
                height: length(svg.getAttribute('height') || '', parent.height, fontSizeOf(svg)) ?? parent.height};
        }
        content.querySelectorAll('foreignObject').forEach(foreign => {
            let label = '';
            function collect(node) {
                if (node.nodeType === 3) { label += node.nodeValue; return; }
                if (node.nodeType !== 1) return;
                const block = /^(p|div|section|br|li)$/.test(node.localName);
                if (block) label += '\n';
                node.childNodes.forEach(collect);
                if (block) label += '\n';
            }
            collect(foreign);
            let lines = label.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
            if (!lines.length) { foreign.remove(); return; }
            const descendants = [foreign, ...foreign.querySelectorAll('*')];
            function styleValue(property) {
                for (const node of descendants) {
                    if (node.style?.getPropertyValue(property)) return node.style.getPropertyValue(property);
                }
                for (let node = foreign.parentElement; node; node = node.parentElement) {
                    if (node.style?.getPropertyValue(property)) return node.style.getPropertyValue(property);
                    if (node.localName === 'svg') break;
                }
                return '';
            }
            const textNode = descendants.find(node => [...node.childNodes].some(child => child.nodeType === 3 && child.nodeValue.trim())) || foreign;
            const fontSize = fontSizeOf(textNode);
            const view = viewport(foreign.closest('svg'));
            const width = length(foreign.getAttribute('width') || '', view.width, fontSize) ?? 200;
            const height = length(foreign.getAttribute('height') || '', view.height, fontSize) ?? fontSize * 1.5 * lines.length;
            canvas.font = `${styleValue('font-style') || 'normal'} ${styleValue('font-weight') || 'normal'} ${fontSize}px ${styleValue('font-family') || 'sans-serif'}`;
            if (width > 0) {
                lines = lines.flatMap(line => {
                    const wrapped = [];
                    let current = '';
                    for (const token of line.match(/\S+\s*|\s+/g) || []) {
                        if (current && canvas.measureText((current + token).trim()).width > width) {
                            wrapped.push(current.trim());
                            current = '';
                        }
                        for (const character of token) {
                            if (current && canvas.measureText((current + character).trim()).width > width) {
                                wrapped.push(current.trim());
                                current = '';
                            }
                            current += character;
                        }
                    }
                    if (current.trim()) wrapped.push(current.trim());
                    return wrapped;
                });
            }
            const group = foreign.ownerDocument.createElementNS(ns, 'g');
            group.setAttribute('data-wechat-svg-label', '');
            if (foreign.hasAttribute('transform')) group.setAttribute('transform', foreign.getAttribute('transform'));
            if (foreign.style.transform) group.style.transform = foreign.style.transform;
            const positioned = foreign.ownerDocument.createElementNS(ns, 'g');
            positioned.setAttribute('transform', `translate(${length(foreign.getAttribute('x') || '', view.width, fontSize) ?? 0},${length(foreign.getAttribute('y') || '', view.height, fontSize) ?? 0})`);
            group.append(positioned);
            const background = styleValue('background-color');
            if (background && background !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(background)) {
                const rect = foreign.ownerDocument.createElementNS(ns, 'rect');
                rect.setAttribute('width', width);
                rect.setAttribute('height', height);
                rect.setAttribute('fill', background);
                rect.setAttribute('stroke', 'none');
                positioned.append(rect);
            }
            const align = styleValue('text-align');
            const text = foreign.ownerDocument.createElementNS(ns, 'text');
            const x = align === 'center' ? width / 2 : align === 'right' || align === 'end' ? width : 0;
            text.setAttribute('text-anchor', align === 'center' ? 'middle' : x ? 'end' : 'start');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', styleValue('color') || '#333');
            text.setAttribute('stroke', 'none');
            text.setAttribute('font-size', fontSize);
            for (const property of ['font-family', 'font-weight', 'font-style']) {
                if (styleValue(property)) text.setAttribute(property, styleValue(property));
            }
            lines.forEach((line, index) => {
                const span = foreign.ownerDocument.createElementNS(ns, 'tspan');
                span.setAttribute('x', x);
                span.setAttribute('y', (index + 0.5) * height / lines.length);
                span.textContent = line;
                text.append(span);
            });
            positioned.append(text);
            foreign.replaceWith(group);
        });
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
        content.querySelectorAll('svg *').forEach(el => {
            if (el.hasAttribute('hidden') || el.style?.display === 'none' || ['hidden', 'collapse'].includes(el.style?.visibility) ||
                (el.style?.opacity && Number(el.style.opacity) === 0) ||
                el.getAttribute('display') === 'none' || ['hidden', 'collapse'].includes(el.getAttribute('visibility'))) el.remove();
        });
        content.querySelectorAll('iframe, video, audio, mp-video, mpvoice, qqmusic, mp-common-video').forEach(el => {
            if (el.closest('svg')) { el.remove(); return; }
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
        content.querySelectorAll('animate, animateMotion, animateTransform, set').forEach(el => el.remove());
        svgLabels(content);
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
        content.removeAttribute('id');
        wrapper.append(content);
        return {html: wrapper.outerHTML, title, author, images: wrapper.querySelectorAll('img, image').length};
    }

    function clipboardContent(editor) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:578px;max-width:100%;margin:0 auto;background:#fff;';
        wrapper.innerHTML = editor.innerHTML;
        const originals = [editor, ...editor.querySelectorAll('*')];
        const copies = [wrapper, ...wrapper.querySelectorAll('*')];
        const properties = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-decoration', 'white-space', 'word-break', 'overflow-wrap', 'box-sizing', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'min-height'];
        copies.forEach((copy, index) => {
            const computed = getComputedStyle(originals[index]);
            for (const property of properties) {
                if (index === 0 && property === 'min-height') continue;
                if (!copy.style.getPropertyValue(property) || copy.style.getPropertyValue(property).includes('var(')) {
                    copy.style.setProperty(property, computed.getPropertyValue(property));
                }
            }
            copy.removeAttribute('class');
        });
        wrapper.querySelectorAll('img, image').forEach(img => {
            const attr = img.localName === 'image' ? 'href' : 'src';
            let src;
            try { src = new URL(img.getAttribute(attr), location.href); } catch { return; }
            if (src.origin === location.origin && src.pathname === '/api/proxy-image') {
                try {
                    const original = new URL(src.searchParams.get('url'));
                    if (['https:', 'http:'].includes(original.protocol) && !original.username && !original.password &&
                        ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'].includes(original.hostname)) {
                        original.protocol = 'https:';
                        img.setAttribute(attr, original.href);
                        return;
                    }
                } catch {}
            }
            img.setAttribute(attr, src.href);
        });
        return {html: wrapper.outerHTML, text: editor.innerText};
    }

    window.WeChatArticle = {articleUrl, extract, clipboardContent};
})();
