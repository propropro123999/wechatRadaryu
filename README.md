# ICviews tools

内容、流量与运营数据工具集。静态页面位于仓库根目录，后端为 Vercel `api/` Functions，无前端编译步骤。

## 工具

首页、文章排版和长图拼接公开访问。以下工具由服务器授权：

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

## 授权与环境变量

在 Vercel 项目 Settings → Environment Variables 配置（分别选择 Production / Preview / Development）：

- `AUTH_SECRET`：使用 `openssl rand -hex 32` 生成独立随机签名密钥。
- `AUTH_CODES`：JSON 对象，结构为 `{"tools":{"<toolId>":{"codes":{"<private-code>":"label"}}}}`。为每个需授权的工具配置独立随机码；不要把真实值提交到仓库。
- `AUTH_MASTER_PASSWORD`：可选，独立随机主密码，授予全部工具权限。不要与授权码或签名密钥复用。

缺少签名密钥或授权配置时，受保护页面/API 返回中文 503 错误，不会放行。
访问受保护页面会转到 `/login.html`。登录由 `/api/login` 在服务器验证，签发 30 天 HMAC-SHA256 Cookie（HttpOnly、Secure、SameSite=Lax、Path=/）。再次登录其他工具会合并已有权限。退出按钮调用 `/api/logout` 清除 Cookie。
浏览器不保存授权码，localStorage 不参与授权。更换 `AUTH_SECRET` 可立即使所有已有 Cookie 失效；修改授权码不会提前撤销已经签发的 30 天 Cookie。

仓库是公开的：不要提交 `.env`、授权配置、密码或密钥。历史上公开过的值应视为已泄露，部署前请轮换。删除当前文件不会清除 Git 历史。

## 纯 Vercel 部署

1. 导入仓库，Framework Preset 选 Other，项目根目录为仓库根目录。
2. 配置上述环境变量。保留 `vercel.json` 中的无操作构建与 `.` 输出目录。
3. 使用 Node.js 24；`.python-version` 固定 Python 3.12，`requirements.txt` 仅安装 pyorc（二进制 wheel）。
4. 部署并验证未登录访问工具时跳转登录，授权后仅对应工具可用。

根目录 `middleware.js` 是非 Next.js 项目支持的 Routing Middleware 入口，使用 Edge runtime、Web Crypto 和 `@vercel/functions` 的 `next()`。
`/api/upload-image` 需 Word 权限；`/api/parse-orc` 需 ORC 权限。公开文章抓取仅允许同源请求；图片代理允许外部编辑器跨源加载复制的文章图片。图片代理拒绝私有地址和重定向，限制 8 MB / 10 秒，并验证图片 Content-Type。

## 本地开发

```sh
npm install
npx vercel login
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

`.env*` 文件不可提交。Cookie 使用 Secure 标志；请使用支持 localhost 安全 Cookie 的浏览器或 HTTPS 开发环境。仅运行静态 HTTP 服务不能测试服务器授权，切勿将静态服务器直接公开为生产服务。

## ORC 解析

DuckDB-Wasm 本地路径保持不变。云端优先调用同源 `/api/parse-orc`；网络错误或 5xx 时回退现有 Railway 服务。401/4xx 不触发回退。Vercel 接口限制上传及 JSON 结果各 4 MB；大文件请优先使用本地解析。时间/日期用 ISO 字符串，Decimal 用字符串，二进制用 Base64 表示。

Railway 仅作为兼容后备：`Dockerfile` 使用独立的 Flask/Gunicorn 安装和 `app.py`，`railway.json` 指定 Docker 构建。后备服务保持原有公开行为，不受 Vercel Cookie 保护。云端解析会上传文件；Word 图片上传会发送到 Catbox。

## 检查

```sh
node tests/auth.test.js
uv run --python 3.12 --with pyorc==0.11.0 python tests/orc_smoke.py
```
