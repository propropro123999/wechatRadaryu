/**
 * 统一导航组件
 * 用法：在页面中调用 renderNav({ title: '工具名称', icon: '📈' })
 */

const NAV_ITEMS = [
  { href: 'content-dashboard.html', icon: '📈', label: '内容数据' },
  { href: 'bandao-ops-dashboard.html', icon: '🧭', label: '专栏/帖子' },
  { href: 'page-traffic-dashboard.html', icon: '🌐', label: '页面流量' },
  { href: 'youmeng.html', icon: '📄', label: '友盟多表' },
  { href: 'yiban-dashboard.html', icon: '📊', label: '壹伴数据' },
  { href: 'image-compress.html', icon: '🗜️', label: '图片压缩' },
  { href: 'pdf-compress.html', icon: '📄', label: 'PDF压缩' },
  { href: 'image-stitch.html', icon: '🖼️', label: '长图拼接' },
  { href: 'article-formatter.html', icon: '📝', label: '文章排版' },
  { href: 'orc-log-parser.html', icon: '🪵', label: 'ORC解析' },
  { href: 'word-to-html.html', icon: '📝', label: 'Word转HTML' },
];

/**
 * 渲染导航栏
 * @param {object} config
 * @param {string} config.title - 工具标题
 * @param {string} config.icon - 工具图标
 * @param {string} config.containerId - 容器 ID，默认 'nav-container'
 * @param {boolean} config.showFileInput - 是否显示文件上传按钮
 * @param {string} config.fileAccept - 文件类型，如 '.csv,.xlsx'
 * @param {string} config.fileLabel - 上传按钮文字
 * @param {function} config.onFileChange - 文件选择回调
 */
function renderNav(config = {}) {
  const {
    title = '工具',
    icon = '🛠️',
    containerId = 'nav-container',
    showFileInput = false,
    fileAccept = '.csv,.xlsx,.xls',
    fileLabel = '📤 选择文件',
    onFileChange = null
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[Nav] 导航容器未找到:', containerId);
    return;
  }

  const menuItems = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-app-item">
      <span class="nav-app-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  const fileInputHtml = showFileInput ? `
    <label class="nav-btn nav-btn-primary">
      ${fileLabel}
      <input type="file" id="nav-file-input" accept="${fileAccept}" style="display: none;">
    </label>
  ` : '';

  container.innerHTML = `
    <nav class="nav-bar">
      <a href="#" class="nav-brand">
        <span class="nav-icon">${icon}</span>
        <span class="nav-title">${title}</span>
      </a>

      <div class="nav-actions">
        ${fileInputHtml}
        
        <div class="nav-switcher">
          <button class="nav-switcher-btn" title="切换工具">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
            </svg>
          </button>
          <div class="nav-switcher-menu">
            ${menuItems}
          </div>
        </div>

        <a href="index.html" class="nav-btn nav-btn-secondary">🏠 首页</a>
      </div>
    </nav>
  `;

  // 绑定文件上传事件
  if (showFileInput && onFileChange) {
    const fileInput = document.getElementById('nav-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', onFileChange);
    }
  }
}

// 导出
window.renderNav = renderNav;
window.NAV_ITEMS = NAV_ITEMS;
