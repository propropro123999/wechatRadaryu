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

## 检查

```sh
node tests/api.test.js
node tests/orc-fallback.test.js
uv run --python 3.12 --with pyorc==0.11.0 python tests/orc_smoke.py
```
