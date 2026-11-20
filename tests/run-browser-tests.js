import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const paths = process.argv.slice(2);
if (!paths.length) paths.push('article-import', 'article-metadata', 'article-clipboard', 'word-to-html', 'display-font', 'toolbox', 'lazy-loading', 'site-nav');
const profile = await mkdtemp(join(tmpdir(), 'toolbox-browser-tests-'));
const browser = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank']);
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    browser.stderr.on('data', data => {
      output += data;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolve(new URL(match[1]));
    });
    browser.on('error', reject);
    browser.on('exit', code => reject(new Error('Chrome exited: ' + code)));
  });
  for (const name of paths) {
    const page = await (await fetch(`http://${endpoint.host}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await once(socket, 'open');
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (pending.has(data.id)) {
        const { resolve, reject, timer } = pending.get(data.id);
        clearTimeout(timer); pending.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id;
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(name + ': timed out')); }, 150000);
      pending.set(key, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: key, method, params }));
    });
    await call('Page.navigate', { url: `${base}/tests/${name}.test.html` });
    const result = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `new Promise(resolve => {
      const timer = setInterval(() => {
        const text = document.getElementById('result')?.textContent || '';
        if (/^(PASS:|FAIL:)/.test(text)) { clearInterval(timer); resolve(text); }
      }, 25);
    })` });
    const text = result.result?.value;
    if (!text?.startsWith('PASS:')) throw new Error(name + ': ' + (text || JSON.stringify(result)));
    console.log(name + ': ' + text);
    await call('Page.close');
    socket.close(); socket = null;
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  if (browser.exitCode === null) await once(browser, 'exit');
  await rm(profile, { recursive: true, force: true });
}
