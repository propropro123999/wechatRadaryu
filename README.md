# ICVEIWS 工具箱

## 入口与授权
- 主入口：`portal.html`
- 主密码：`dcone2025`
- 授权码文件：`auth-codes.json`（根目录静态可访问）。
- 本地/无法访问 auth-codes.json 时的内置授权码：
  - 内容数据分析（content-dashboard）：`ICV-2025-7QAF` 等
  - 专栏/帖子工具（bandao-ops-dashboard）：`BDQ-2025-A1B2` 等
  - 页面流量分析（page-traffic-dashboard）：`PTD-2025-1A2B` 等

## 页面映射
- 入口导航：`portal.html`
- 公众号内容分析：`content-dashboard.html`
- 专栏/帖子工具：`bandao-ops-dashboard.html`
- 页面流量分析：`page-traffic-dashboard.html`
- 友盟多表流量：`youmeng.html`
- 图片压缩：`image-compress.html`

## 功能概览
- 公众号内容分析：CSV/XLSX 导入，自动字段识别，Summary/Top 榜/完成率/送达率/四象限洞察。
- 专栏/帖子工具：发布频次、作者分层、互动结构、高频词、主题聚类，支持年终复盘场景。
- 页面流量分析：解析标题，多维 UV/PV/来源分布，可视化展示（需导入流量表）。
- 友盟多表流量：支持多 Sheet（季度等）受访页面表，汇总 PV/UV、类型分布、TOP 榜、按 Sheet 对比。
- 图片压缩：浏览器端批量压缩，支持质量/尺寸/格式控制，ZIP 打包下载。

## 部署提示
- 将 `auth-codes.json` 放根目录，可直接通过 `/auth-codes.json` 访问。
- 若使用 Vercel 等静态托管，可为 `auth-codes.json` 设置 `Cache-Control: no-store` 以便随时更新。
