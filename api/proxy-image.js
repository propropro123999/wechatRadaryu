import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const limit = 8 * 1024 * 1024;
export function privateAddress(address) {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (ip.includes(':')) return !/^[23][0-9a-f]{0,3}:/.test(ip) || ip.startsWith('2001:db8:');
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19));
}
export default async function handler(req, res) {
  let url, addresses;
  try {
    url = new URL(req.query.url);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (url.port && !['80', '443'].includes(url.port)) ||
        /(^|\.)(localhost|local|internal|home|lan)\.?$/i.test(host) || (!host.includes('.') && !isIP(host))) throw new Error();
    if (isIP(host)) addresses = [{address: host, family: isIP(host)}];
    else {
      let timer;
      try {
        addresses = await Promise.race([lookup(host, {all: true}), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error()), 3000); })]);
      } finally { clearTimeout(timer); }
    }
    if (!addresses.length || addresses.some(({address}) => privateAddress(address))) throw new Error();
  } catch { return res.status(400).json({error: '不允许的图片地址'}); }
  try {
    const {buffer, contentType} = await new Promise((resolve, reject) => {
      const pinned = addresses[0];
      const upstream = (url.protocol === 'https:' ? https : http).get(url, {
        lookup: (_hostname, options, callback) => options.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
        headers: {'Referer': 'https://mp.weixin.qq.com/', 'User-Agent': 'Mozilla/5.0'}
      }, response => {
        const contentType = response.headers['content-type'] || '';
        if (response.statusCode !== 200 || !/^image\//i.test(contentType) || Number(response.headers['content-length']) > limit) {
          response.destroy(); reject(new Error('无效图片')); return;
        }
        const chunks = []; let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size > limit) response.destroy(new Error('图片过大'));
          else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => resolve({buffer: Buffer.concat(chunks), contentType}));
      });
      const timer = setTimeout(() => upstream.destroy(new Error('请求超时')), 10000);
      upstream.on('close', () => clearTimeout(timer));
      upstream.on('error', reject);
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buffer);
  } catch { return res.status(502).json({error: '图片获取失败（超时、格式不符或超过 8 MB）'}); }
}
