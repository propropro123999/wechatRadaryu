# ICviews tools

内容、流量与运营数据工具集。静态页面位于仓库根目录，后端为 Vercel `api/` Functions，无前端编译步骤。

## 工具

所有工具均公开访问，无需登录或授权码；Word 图片暂存需部署者配置自有 Vercel Blob，其他功能无需环境变量。

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
2. 保留 `vercel.json` 中的无操作构建、`.` 输出目录及 clean URLs。需要 Word 图片暂存时，按下节连接 Blob 并设置环境变量。
3. 使用 Node.js 24；`.python-version` 固定 Python 3.12，`requirements.txt` 仅安装 pyorc（二进制 wheel）。
4. 部署后直接访问工具页面，无需登录。

`/api/parse-orc` 公开访问。`/api/upload-image` 仅接受同源 JSON 请求，限制 PNG/JPEG/GIF/WebP 的文件签名与单图 3 MB；同源限制不是用户鉴权，知道接口的人仍可调用。公开工具上线前应在 Vercel Firewall 为该路径配置速率限制，并设置用量/费用提醒，防止他人滥用存储。文章抓取接口在 handler 内仅允许同源请求；图片代理允许外部编辑器跨源加载复制的文章图片。图片代理拒绝私有地址和重定向，限制 8 MB / 10 秒，并验证图片 Content-Type。

## Word 图片暂存与自动清理

不再向 Catbox 发送新图片，也不会在 Blob 不可用时回退第三方图床。原有 Catbox 链接不会因此自动迁移或删除。

1. 打开 [项目 Storage](https://vercel.com/luyus-projects-a67d89c5/wechat-radaryu/stores)，**Create Storage → Blob**，例如命名为 `word-images`，访问权限选 **Public**（外部编辑器需要直接读取图片）。
2. 连接本项目的 **Preview**、**Production** 环境；需要本地真机调用时再勾选 **Development**。勾选 **Add a read-write token env var to this connection**，使用默认名 `BLOB_READ_WRITE_TOKEN`，不要加前缀。
3. 在 [项目环境变量](https://vercel.com/luyus-projects-a67d89c5/wechat-radaryu/settings/environment-variables) 为相同环境添加 `CRON_SECRET`，用密码管理器生成至少 32 位随机字母数字。两个值仅保留在服务器环境中，不提交仓库，不填到网页，不发到聊天。
4. 设置后重新部署待验收的 **Preview**。配置缺失时上传会明确报错并保留原图；不会显示假成功。
5. 负责人批准并合并后，生产部署会注册每日 `0 3 * * *`（UTC，Hobby 可在该小时内任意时刻运行）的 `/api/cleanup-word-images`。Preview 不会自动触发 Cron。

图片文件名随机生成，仅在 `word-images/{production,preview,development}/` 下写入。清理器只处理这些专用目录中本功能的随机文件名，使用 Blob 的 `uploadedAt` 判断是否超过 7 天；遍历所有分页，分批删除，不清空整个存储桶。连接同一存储桶的预览与生产图片均在清理范围内，不要手动把长期图片放进这些目录。

Vercel 自动为 Cron 发送 `Authorization: Bearer <CRON_SECRET>`；缺失或不匹配会拒绝执行。可在安全的服务端环境用同一鉴权请求 `/api/cleanup-word-images?dryRun=1` 检查候选数量而不删除，再调用无查询参数的端点执行清理。接口不返回图片清单或密钥。重复执行不会删除未过期图片；失败不会由 Vercel 自动重试，应查看 Cron 运行状态并处理。每日扫描通常保留约 7–8 天，但任务失败会延后删除，不能视为严格到点过期保证。

**隐私与粘贴限制：** Public Blob 不是私密存储，持有链接的人都可读取，请勿上传敏感图片。仅粘贴不代表目标编辑器已自行转存；如果它仍引用 Blob 链接，清理后会破图。请在暂存期内确认目标平台已转存。复制不会立即删除图片；删除源图也不能撤回已经下载或转存的副本。此改动不保证所有编辑器都接受外链图片。

官方说明：[服务端上传](https://vercel.com/docs/vercel-blob/server-upload)、[Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)、[Cron 配置与鉴权](https://vercel.com/docs/cron-jobs/manage-cron-jobs)。

## 本地开发

```sh
npm install
npx vercel login
npx vercel link
npx vercel dev
```

静态 HTTP 服务可预览页面，但 API 功能需通过 `vercel dev` 运行。真实 Blob 调用需连接 Development 环境并安全地执行 `vercel env pull`；自动化测试使用模拟 SDK，不需要密钥或联网存储。

## ORC 解析

DuckDB-Wasm 本地路径保持不变。云端优先调用同源 `/api/parse-orc`；网络错误或 5xx 时回退现有 Railway 服务。401/4xx 不触发回退。Vercel 接口限制上传及 JSON 结果各 4 MB；大文件请优先使用本地解析。时间/日期用 ISO 字符串，Decimal 用字符串，二进制用 Base64 表示。

Railway 仅作为兼容后备：`Dockerfile` 使用独立的 Flask/Gunicorn 安装和 `app.py`，`railway.json` 指定 Docker 构建。后备服务保持原有公开行为。云端解析会上传文件；点击 Word 图片暂存会发送图片到部署者自己的 Public Vercel Blob。

## 检查

```sh
node tests/api.test.js
node tests/orc-fallback.test.js
node --test tests/word-images.test.js
uv run --python 3.12 --with pyorc==0.11.0 python tests/orc_smoke.py
```

浏览器回归：本地打开 `/tests/word-blob.test.html`，覆盖 Blob 链接替换、部分失败重试、配置缺失与保留原图；上传响应为明确的测试桩，不代表真实 Blob 写入已验收。
