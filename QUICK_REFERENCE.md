# 快速参考指南 - 设计系统使用手册

**最后更新**: 2025-12-15

---

## 🎯 快速开始

### 1. 在 HTML 中引入设计系统

```html
<head>
  <!-- 核心设计系统 -->
  <link rel="stylesheet" href="design-system-modern.css" />

  <!-- 微交互和动画 -->
  <link rel="stylesheet" href="tool-pages-interactions.css" />
</head>
```

### 2. 查看演示首页

打开 `index-modern.html` 查看设计系统的完整演示。

---

## 🎨 常用色彩类

```html
<!-- 文字颜色 -->
<p class="text-primary">主要文字 (#0f1419)</p>
<p class="text-secondary">次要文字 (#65676b)</p>
<p class="text-tertiary">三级文字 (#9095a1)</p>
<p class="text-primary-color">主色文字 (#3b82f6)</p>

<!-- 功能色 -->
<p class="text-success">成功</p>
<p class="text-warning">警告</p>
<p class="text-error">错误</p>
<p class="text-info">信息</p>

<!-- 背景 -->
<div class="bg-primary">主背景 (#fff)</div>
<div class="bg-secondary">次背景 (#f8f9fa)</div>
<div class="bg-tertiary">三级背景 (#f1f3f5)</div>
```

---

## 📏 字号和字重

```html
<!-- 字号 -->
<h1>标题 1 (32px)</h1>
<h2>标题 2 (28px)</h2>
<h3>标题 3 (24px)</h3>
<h4>标题 4 (20px)</h4>
<h5>标题 5 (18px)</h5>
<h6>标题 6 (16px)</h6>

<p class="text-lg">大文字 (16px)</p>
<p class="text-base">正常文字 (14px)</p>
<p class="text-sm">小文字 (13px)</p>
<p class="text-xs">超小文字 (12px)</p>

<!-- 字重 -->
<p class="font-light">Light (300)</p>
<p class="font-normal">Normal (400)</p>
<p class="font-medium">Medium (500)</p>
<p class="font-semibold">Semibold (600)</p>
<p class="font-bold">Bold (700)</p>
```

---

## 🔲 网格和布局

### Flexbox 网格

```html
<div class="container">
  <div class="row">
    <div class="col-3">25%</div>
    <div class="col-3">25%</div>
    <div class="col-3">25%</div>
    <div class="col-3">25%</div>
  </div>
</div>
```

### CSS Grid

```html
<!-- 3 列网格 -->
<div class="grid grid-3 gap-lg">
  <div>卡片 1</div>
  <div>卡片 2</div>
  <div>卡片 3</div>
</div>

<!-- 4 列网格 -->
<div class="grid grid-4 gap-md">
  <div>项 1</div>
  <div>项 2</div>
</div>

<!-- 自适应网格 (min 280px) -->
<div class="grid grid-auto gap-lg">
  <div>自动调整</div>
  <div>自动调整</div>
</div>
```

---

## 📦 常用间距

```html
<!-- 外边距 -->
<div class="mt-lg">上边距 (16px)</div>
<div class="mb-xl">下边距 (20px)</div>
<div class="mx-auto">水平居中</div>
<div class="m-2xl">四周边距 (24px)</div>

<!-- 内边距 -->
<div class="p-lg">内边距 (16px)</div>
<div class="px-xl">左右内边距 (20px)</div>
<div class="py-md">上下内边距 (12px)</div>

<!-- 网格间隙 -->
<div class="grid gap-lg">间隙 (16px)</div>
<div class="grid gap-2xl">间隙 (24px)</div>

<!-- 快速间距 -->
<div class="flex gap-1">极小间隙 (4px)</div>
<div class="flex gap-2">小间隙 (8px)</div>
<div class="flex gap-3">中间隙 (12px)</div>
```

---

## 🎛️ Flexbox 工具

```html
<!-- 基础 Flex -->
<div class="flex">横向布局</div>
<div class="flex flex-col">纵向布局</div>

<!-- 对齐 -->
<div class="flex-center">完全居中</div>
<div class="flex-between">两端对齐</div>
<div class="flex-around">环绕对齐</div>
<div class="justify-center">水平居中</div>
<div class="items-center">垂直居中</div>

<!-- 换行 -->
<div class="flex flex-wrap">允许换行</div>
<div class="flex flex-nowrap">不换行</div>

<!-- 弹性 -->
<div class="flex">
  <div class="flex-1">分享剩余空间</div>
  <div class="flex-none">不伸缩</div>
</div>
```

---

## 🎨 圆角和边框

```html
<!-- 圆角 -->
<div class="rounded">大圆角 (12px)</div>
<div class="rounded-lg">大 (12px)</div>
<div class="rounded-md">中 (8px)</div>
<div class="rounded-sm">小 (6px)</div>
<div class="rounded-full">完全圆 (9999px)</div>
```

---

## 💫 交互类

```html
<!-- 按钮效果 -->
<button>按钮会在悬停时抬起</button>
<button disabled>禁用状态</button>

<!-- 输入框效果 -->
<input type="text" placeholder="获得焦点时有光晕效果" />

<!-- 卡片效果 -->
<div class="card">卡片在悬停时会升起并加深阴影</div>

<!-- 加载动画 -->
<div class="loading">旋转动画</div>
<div class="pulse">脉冲动画</div>

<!-- 动画类 -->
<div class="fade-in">淡入效果</div>
<div class="success">成功反馈 (上升滑入)</div>
<div class="error">错误反馈 (下降滑入)</div>
```

---

## 📱 响应式助手

### 显示/隐藏

```html
<!-- 大屏隐藏 -->
<div class="hidden-lg">仅在手机显示</div>

<!-- 平板隐藏 -->
<div class="hidden-md">在平板隐藏</div>

<!-- 手机隐藏 -->
<div class="hidden-sm">仅在桌面显示</div>

<!-- 超小屏隐藏 -->
<div class="hidden-xs">超小屏隐藏</div>
```

### 布局响应

```html
<!-- 网格自动响应 -->
<div class="grid grid-4 gap-lg">
  <!-- 大屏 4 列，平板 2 列，手机 1 列 -->
</div>

<!-- Flexbox 响应 -->
<div class="flex flex-col-sm">
  <!-- 手机时变为列布局 -->
</div>
```

---

## 🔍 实用工具

```html
<!-- 显示/隐藏 -->
<div class="hidden">完全隐藏</div>
<div class="invisible">隐藏但占位</div>

<!-- 文本对齐 -->
<div class="text-center">居中</div>
<div class="text-left">左对齐</div>
<div class="text-right">右对齐</div>

<!-- 不可选 -->
<div class="no-select">无法选中文字</div>

<!-- 光标 -->
<div class="cursor-pointer">鼠标指针</div>
<div class="cursor-default">默认光标</div>

<!-- 透明度 -->
<div class="opacity-50">50% 透明</div>
<div class="opacity-75">75% 透明</div>
```

---

## 📊 CSS 变量参考

### 色彩变量
```css
--color-primary: #3b82f6          /* 主色 */
--color-text-primary: #0f1419     /* 主文字 */
--color-bg-primary: #ffffff       /* 主背景 */
--color-success: #10b981          /* 成功色 */
--color-error: #ef4444            /* 错误色 */
--color-warning: #f59e0b          /* 警告色 */
--color-info: #06b6d4             /* 信息色 */
```

### 间距变量
```css
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 20px
--space-2xl: 24px
--space-3xl: 32px
--space-4xl: 40px
```

### 阴影变量
```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1)
```

### 过渡变量
```css
--transition-fast: 150ms
--transition-base: 200ms
--transition-slow: 300ms
```

---

## 🎬 动画类参考

| 类名 | 效果 | 持续时间 |
|------|------|--------|
| `.loading` | 旋转 360° | 1s |
| `.pulse` | 脉冲 | 2s |
| `.shimmer` | 闪烁扫过 | 2s |
| `.fade-in` | 淡入 | 200ms |
| `.success` | 上升滑入 | 200ms |
| `.error` | 下降滑入 | 200ms |

---

## 💡 使用建议

### 最佳实践

1. **使用 CSS 变量** - 始终使用变量而不是硬编码颜色
2. **遵循网格系统** - 使用栅格而不是自定义 margin
3. **一致的间距** - 只用预设间距值
4. **响应式优先** - 从小屏开始设计
5. **测试所有断点** - 确保在所有设备上看起来正确

### 避免

- ❌ 硬编码 HEX 颜色 (使用 CSS 变量)
- ❌ 自定义间距值 (使用预设值)
- ❌ 破坏网格系统 (保持对齐)
- ❌ 过度使用动画 (影响性能)
- ❌ 忽视响应式 (所有设备都要看)

---

## 📚 更多信息

查看这些文档了解详细信息：

- **DESIGN_SYSTEM_UPGRADE_SUMMARY.md** - 完整项目总结
- **DESIGN_SYSTEM_TEST.md** - 测试清单和验证步骤
- **AUTH_CODES_GUIDE.md** - 授权码配置指南
- **design-system-modern.css** - CSS 源代码
- **tool-pages-interactions.css** - 交互代码

---

## 🆘 快速问题解答

**Q: 如何改变整个网站的主色？**
A: 修改 `design-system-modern.css` 中的 `--color-primary` 变量

**Q: 如何添加新的响应式断点？**
A: 在 CSS 文件中添加新的 `@media` 查询

**Q: 如何禁用某个动画？**
A: 添加 `prefers-reduced-motion` 媒体查询支持

**Q: 旧的 common-styles.css 还能用吗？**
A: 可以，但建议迁移到新系统以获得最新功能

---

**开心编码！** 🚀
