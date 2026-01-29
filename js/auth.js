/**
 * 统一授权模块
 * 用法：在页面底部引入后调用 initAuth('tool-id')
 */

const AUTH_CONFIG = {
  // 内置授权码（file:// 模式或 fetch 失败时兜底）
  inlineCodes: {
    'content-analysis': ['ICV-2025-7QAF', 'ICV-2025-P3ZD', 'ICV-2025-L8XK', 'ICV-2025-G2MW', 'ICV-2025-R9CE', 'ICV-2025-H4VU', 'ICV-2025-Y1SN', 'ICV-2025-K5BJ', 'ICV-2025-X7TP', 'ICV-2025-W6QD'],
    'bandaoquantiezi': ['BDQ-2025-A1B2', 'BDQ-2025-C3D4', 'BDQ-2025-E5F6', 'BDQ-2025-G7H8', 'BDQ-2025-I9J0', 'BDQ-2025-K1L2', 'BDQ-2025-M3N4', 'BDQ-2025-O5P6', 'BDQ-2025-Q7R8', 'BDQ-2025-S9T0'],
    'page-traffic': ['PTD-2025-1A2B', 'PTD-2025-3C4D', 'PTD-2025-5E6F', 'PTD-2025-7G8H', 'PTD-2025-9I0J', 'PTD-2025-1K2L', 'PTD-2025-3M4N', 'PTD-2025-5O6P', 'PTD-2025-7Q8R', 'PTD-2025-9S0T'],
    'youmeng-traffic': ['YMT-2025-A1B2', 'YMT-2025-C3D4', 'YMT-2025-E5F6', 'YMT-2025-G7H8', 'YMT-2025-I9J0', 'YMT-2025-K1L2', 'YMT-2025-M3N4', 'YMT-2025-O5P6', 'YMT-2025-Q7R8', 'YMT-2025-S9T0', 'dcone2025'],
    'yiban-analysis': ['YB-2025-A1B2', 'YB-2025-C3D4', 'YB-2025-E5F6', 'YB-2025-G7H8', 'YB-2025-I9J0', 'YB-2025-K1L2', 'YB-2025-M3N4', 'YB-2025-O5P6', 'YB-2025-Q7R8', 'YB-2025-S9T0'],
    'orc-parser': ['ORC-2025-A1B2', 'ORC-2025-C3D4', 'dcone2025'],
    'pdf-compress': ['PDF-2025-A1B2', 'PDF-2025-C3D4', 'PDF-2025-E5F6', 'PDF-2025-G7H8', 'PDF-2025-I9J0', 'PDF-2025-K1L2', 'PDF-2025-M3N4', 'PDF-2025-O5P6', 'PDF-2025-Q7R8', 'PDF-2025-S9T0', 'dcone2025'],
    'word-parser': ['WORD-2025-A1B2', 'dcone2025'],
    'image-compress': ['dcone2025'],
  },
  // 通用密码（所有工具通用）
  masterPassword: 'dcone2025'
};

let _toolId = '';
let _authCodes = [];
let _authLoaded = false;

/**
 * 初始化授权系统
 * @param {string} toolId - 工具ID，对应 auth-codes.json 中的 key
 * @param {object} options - 配置项
 * @param {string} options.authScreenId - 授权层 DOM ID，默认 'auth-screen'
 * @param {string} options.appId - 应用根节点 DOM ID，默认 'app'
 * @param {string} options.inputId - 输入框 DOM ID，默认 'auth-code'
 * @param {string} options.btnId - 按钮 DOM ID，默认 'auth-btn'
 * @param {string} options.errorId - 错误提示 DOM ID，默认 'auth-error'
 * @param {string} options.cardId - 卡片 DOM ID（用于抖动动画），默认 'auth-card'
 */
async function initAuth(toolId, options = {}) {
  _toolId = toolId;
  
  const config = {
    authScreenId: 'auth-screen',
    appId: 'app',
    inputId: 'auth-code',
    btnId: 'auth-btn',
    errorId: 'auth-error',
    cardId: 'auth-card',
    ...options
  };

  // 等待 DOM 加载
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  const authScreen = document.getElementById(config.authScreenId);
  const appRoot = document.getElementById(config.appId);
  const input = document.getElementById(config.inputId);
  const btn = document.getElementById(config.btnId);
  const errEl = document.getElementById(config.errorId);
  const cardEl = document.getElementById(config.cardId);

  if (!authScreen || !appRoot) {
    console.warn('[Auth] 授权元素未找到，跳过授权检查');
    return;
  }

  // 初始状态：显示授权层，隐藏应用
  authScreen.style.display = 'flex';
  appRoot.style.display = 'none';

  // 加载授权码
  await loadAuthCodes(toolId);

  // 检查已保存的授权
  const storageKey = `auth_${toolId}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.code && isValidCode(parsed.code)) {
        showApp(authScreen, appRoot, storageKey, parsed.code);
        return;
      }
      localStorage.removeItem(storageKey);
    }
  } catch (e) {
    localStorage.removeItem(storageKey);
  }

  // 绑定事件
  const handleAuth = () => {
    const code = (input?.value || '').trim();
    
    if (!code) {
      showError(errEl, '请输入授权码');
      shakeCard(cardEl);
      return;
    }
    
    if (!isValidCode(code)) {
      showError(errEl, '授权码无效，请确认后重新输入');
      shakeCard(cardEl);
      return;
    }
    
    showError(errEl, '');
    showApp(authScreen, appRoot, storageKey, code);
  };

  btn?.addEventListener('click', handleAuth);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuth();
  });

  // 自动聚焦
  setTimeout(() => input?.focus(), 100);
}

async function loadAuthCodes(toolId) {
  // file:// 模式直接用内置
  if (location.protocol === 'file:') {
    _authCodes = AUTH_CONFIG.inlineCodes[toolId] || [];
    _authLoaded = true;
    return;
  }

  try {
    const res = await fetch('./auth-codes.json?' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    if (data.tools?.[toolId]?.codes) {
      _authCodes = Object.keys(data.tools[toolId].codes);
    }
    _authLoaded = true;
  } catch (e) {
    console.warn('[Auth] 授权码文件加载失败，使用内置授权码');
    _authCodes = AUTH_CONFIG.inlineCodes[toolId] || [];
    _authLoaded = true;
  }
}

function isValidCode(code) {
  return _authCodes.includes(code) || code === AUTH_CONFIG.masterPassword;
}

function showApp(authScreen, appRoot, storageKey, code) {
  authScreen.style.display = 'none';
  appRoot.style.display = 'block';
  appRoot.classList.add('visible');
  
  try {
    localStorage.setItem(storageKey, JSON.stringify({ code, ts: Date.now() }));
  } catch (e) {}
}

function showError(el, msg) {
  if (el) el.textContent = msg;
}

function shakeCard(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// 导出给全局使用
window.initAuth = initAuth;
