# ICviews tools

内容、流量与运营数据工具集。静态页面位于仓库根目录，后端为 Vercel `api/` Functions，无前端编译步骤。

## 工具

所有工具均公开访问，无需登录、授权码或环境变量。

| 页面 | tool id |
| --- | --- |
| content-dashboard.html | content-analysis |
| bandao-ops-dashboard.html | bandaoquantiezi |
| page-traffic-dashboard.html | page-traffic |
| youmeng.html | youmeng-traffic |
| yiban-dashboard.html | yiban-analysis |
| image-compress.html | image-compress |
| orc-log-parser.html | orc-parser |
| pdf-compress.html | pdf-compress |
| word-to-html.html | word-parser |

仓库是公开的：不要提交 `.env`、密码或密钥。历史上公开过的值应视为已泄露。删除当前文件不会清除 Git 历史。

## 纯 Vercel 部署

1. 导入仓库，Framework Preset 选 Other，项目根目录为仓库根目录。
2. 无需配置环境变量。保留 `vercel.json` 中的无操作构建、`.` 输出目录及 clean URLs。
3. 使用 Node.js 24；`.python-version` 固定 Python 3.12，`requirements.txt` 仅安装 pyorc（二进制 wheel）。
4. 部署后直接访问工具页面，无需登录。

`/api/upload-image` 和 `/api/parse-orc` 公开访问。文章抓取接口在 handler 内仅允许同源请求；图片代理允许外部编辑器跨源加载复制的文章图片。图片代理拒绝私有地址和重定向，限制 8 MB / 10 秒，并验证图片 Content-Type。

## 本地开发

```sh
npm install
npx vercel login
npx vercel link
npx vercel dev
```

无需环境变量。静态 HTTP 服务可预览页面，但 API 功能需通过 `vercel dev` 运行。

## ORC 解析

DuckDB-Wasm 本地路径保持不变。云端优先调用同源 `/api/parse-orc`；网络错误或 5xx 时回退现有 Railway 服务。401/4xx 不触发回退。Vercel 接口限制上传及 JSON 结果各 4 MB；大文件请优先使用本地解析。时间/日期用 ISO 字符串，Decimal 用字符串，二进制用 Base64 表示。

Railway 仅作为兼容后备：`Dockerfile` 使用独立的 Flask/Gunicorn 安装和 `app.py`，`railway.json` 指定 Docker 构建。后备服务保持原有公开行为。云端解析会上传文件；Word 图片上传会发送到 Catbox。

## 文章图文复制

「复制结果」保留正常图文与原始纯文本；「兼容复制」用于半导纵横等旧版 wangEditor 后台，避免纯文本网址触发目标编辑器的特殊粘贴分支而丢失图片。兼容模式只在剪贴板的 `text/plain` 中将 `http://`、`https://`、`ftp://` 改成带空格的 `http ://` 等形式，`text/html`、真实图片地址、链接地址和当前原稿保持不变。粘贴到记事本时也会看到这个空格，需要原始网址时使用普通复制。

两个按钮都写入图文和纯文本格式，优先使用 Clipboard API，不支持时回退到同样的富文本复制；不会静默退回纯文本。无需插件、登录、新依赖或图片转存。复制成功仅代表剪贴板已写入，目标后台是否保留图片、图片防盗链和外链有效期仍需粘贴后核对；不能承诺任意编辑器都兼容，也不替目标后台关闭图片过滤规则。

## 展示字体

品牌、展示标题和格式标签使用 [Allo by Josh Puckett](https://allo.joshpuckett.me/) 1.0.3，字体与 SIL Open Font License 1.1 授权保存在 `fonts/`。仅自托管一份约 241 KiB 的 Friendly WOFF2 可变字体（字重 100–900、自动光学尺寸、固定圆润度 50），无需字体 CDN 或额外构建步骤。

Allo 不含中文字形，中文沿用系统字体。展示字体仅通过 `workspace.css` 的明确区域选择器启用；不修改正文 `--font-sans`，也不应用于编辑器、Word 预览、输入控件、数据表、图表或复制/导出内容。新增展示位置时应保持这一边界，勿将 Allo 设为全局字体。

## 检查

```sh
node tests/api.test.js
node tests/orc-fallback.test.js
node tests/workspace.test.js
uv run --python 3.12 --with pyorc==0.11.0 python tests/orc_smoke.py
```

静态服务启动后打开 `tests/display-font.test.html`，可检查全部 12 页的展示字体加载、功能区域隔离和文章 / Word 的复制结果。
