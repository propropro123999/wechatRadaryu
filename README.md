# Luyu的工具箱

内容、流量与运营数据工具集。静态页面位于仓库根目录，后端为 Vercel `api/` Functions，无前端编译步骤。

## 工具

所有工具均公开访问，无需登录、授权码或环境变量。

| 页面 | tool id |
| --- | --- |
| content-dashboard.html | content-analysis |
| community-dashboard.html | community-analysis |
| page-traffic-dashboard.html | page-traffic |
| youmeng.html | youmeng-traffic |
| yiban-dashboard.html | yiban-analysis |
| image-compress.html | image-compress |
| image-watermark.html | image-watermark |
| orc-log-parser.html | orc-parser |
| pdf-compress.html | pdf-compress |
| word-to-html.html | word-parser |

仓库是公开的：不要提交 `.env`、密码或密钥。历史上公开过的值应视为已泄露。删除当前文件不会清除 Git 历史。

## 纯 Vercel 部署

1. 导入仓库，Framework Preset 选 Other，项目根目录为仓库根目录。
2. 无需配置环境变量。保留 `vercel.json` 中的无操作构建、`.` 输出目录及 clean URLs。
3. 使用 Node.js 24；`.python-version` 固定 Python 3.12，`requirements.txt` 仅安装 pyorc（二进制 wheel）。
4. 部署后直接访问工具页面，无需登录。

`/api/fetch-article` 和 `/api/upload-image` 仅允许同源请求（`upload-image` 限制图片白名单与 4 MB 上限，并转发到 Catbox）；`/api/parse-orc` 公开访问；图片代理允许外部编辑器跨源加载复制的文章图片，拒绝私有地址、重定向和 `image/svg+xml`，限制 4 MB / 10 秒（对齐 Vercel Serverless 4.5 MB 响应上限），并启用 CDN `s-maxage` 缓存以节省函数调用额度。

## 本地开发

```sh
npm install
npx vercel login
npx vercel link
npx vercel dev
```

无需环境变量。静态 HTTP 服务可预览页面，但 API 功能需通过 `vercel dev` 运行。

## ORC 解析

DuckDB-Wasm 本地路径保持不变。云端仅调用同源 Vercel `/api/parse-orc`，并在上传前拦截大于 4 MB 的文件，多文件按队列串行解析以避免突发并发冷启动。Vercel 接口限制上传及 JSON 结果各 4 MB；大文件请先拆分。时间/日期用 ISO 字符串，Decimal 用字符串，二进制用 Base64 表示。云端解析会上传文件；Word 图片上传会发送到 Catbox。

## 文章图文复制

「复制结果」保留正常图文与原始纯文本；「兼容复制」针对旧版 wangEditor 后台反馈的“含网址正文粘贴只剩文字”问题，尝试绕过纯文本网址相关的粘贴分支，具体效果仍需在目标后台核对。兼容模式只在剪贴板的 `text/plain` 中将 `http://`、`https://`、`ftp://` 改成带空格的 `http ://` 等形式，`text/html`、真实图片地址、链接地址和当前原稿保持不变。粘贴到记事本时也会看到这个空格，需要原始网址时使用普通复制。

两个按钮都写入图文和纯文本格式，优先使用 Clipboard API，不支持时回退到同样的富文本复制；不会静默退回纯文本。无需插件、登录、新依赖或图片转存。复制成功仅代表剪贴板已写入，目标后台是否保留图片、图片防盗链和外链有效期仍需粘贴后核对；不能承诺任意编辑器都兼容，也不替目标后台关闭图片过滤规则。

## 展示字体

品牌、展示标题和格式标签使用 [Allo by Josh Puckett](https://allo.joshpuckett.me/) 1.0.3，字体与 SIL Open Font License 1.1 授权保存在 `fonts/`。仅自托管一份约 241 KiB 的 Friendly WOFF2 可变字体（字重 100–900、自动光学尺寸、固定圆润度 50），无需字体 CDN 或额外构建步骤。

Allo 不含中文字形，中文沿用系统字体。展示字体仅通过 `workspace.css` 的明确区域选择器启用；不修改正文 `--font-sans`，也不应用于编辑器、Word 预览、输入控件、数据表、图表或复制/导出内容。新增展示位置时应保持这一边界，勿将 Allo 设为全局字体。

## 可靠性、本机草稿与按需加载

数据页在选择报表时才加载 XLSX 和固定版本 Plotly，示例下载只加载 XLSX；Word 在导入时加载 Mammoth，图片打包时才加载 JSZip。ORC 的 DuckDB 模块与 Wasm 在本地解析开始时初始化。依赖加载失败可重试，不增加构建或后台服务。

PDF 预览按需加载 PDF.js 4.10.38；压缩在 Worker 中真正重编码常见 RGB / 灰度 JPEG 图片，并保留文字、矢量和链接。带蒙版、自定义解码或其他编码的图片保持原样。无法缩小时返回原文件并明确说明；这时也不移除元数据。修改 PDF 会使原有数字签名失效，应保留原件。压缩可取消，文件不上传。

Word 图片上传仍使用 Catbox，仅在明确点击后上传图片。逐项报告成功和失败，重试跳过已完成图片；接口失败、超时和无效返回地址不再报告全部成功。

文章与 Word 草稿（包含图片）存入浏览器 IndexedDB，不上传、不跨设备同步；7 天后不再提供恢复并在下次访问时清理。旧草稿需明确选择恢复或替换。清除会同时关闭该工具的自动保存，避免页面内容立即重新写回；可手动重新开启。浏览器禁用存储、空间不足或草稿过大时会提示未保存，并保留离开提醒。共享电脑请清除草稿。

## 检查

```sh
node tests/api.test.js
node tests/orc-fallback.test.js
node tests/workspace.test.js
node tests/toolbox.test.js
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python tests/orc_smoke.py
```

无需额外测试包，Node.js 24 + Chrome 可运行全部浏览器回归（先在另一终端运行 `python3 -m http.server 3000 --bind 127.0.0.1`）：

```sh
node tests/run-browser-tests.js
# 也可只跑新增的测试
node tests/run-browser-tests.js toolbox lazy-loading
```

`CHROME_BIN` 可指定 Chrome 路径，`TEST_BASE_URL` 可指定本地静态服务地址。测试使用独立临时浏览器配置，不操作日常浏览器登录；CDN 依赖需要联网。新增夹具生成真实 DOCX、JPEG / PNG / 灰度软蒙版 PDF，检查草稿清除/恢复/过期/安全性、PDF 预览/重编码/取消/原件回退、五个报表页的实际 XLSX/Plotly 加载与渲染，以及 DuckDB 初始化失败的云端回退。上传错误与重试使用模拟 API，不会把测试图片上传 Catbox。

静态服务启动后打开 `tests/display-font.test.html`，可检查全部 12 页的展示字体加载、功能区域隔离和文章 / Word 的复制结果。

`tests/article-clipboard.test.html` 检查普通 / 兼容复制的 HTML 与纯文本差异、图片和真实链接保留、Clipboard API / 富文本回退、失败提示、连续复制及清理。这是浏览器内模拟剪贴板的回归测试，不代表真实目标后台验收。
