/**
 * 敏感词检测 API
 * 使用内置敏感词库进行实时检测和处理
 */

// 内置敏感词库 - 可以扩展或从外部加载
const SENSITIVE_WORDS = [
  // 政治敏感词
  '违法', '违规', '违禁', '非法', '违宪', '违反', '危害', '破坏',
  // 不良内容
  '骗子', '骗局', '诈骗', '诈骗', '黄赌毒', '毒品', '赌博', '赌场',
  // 色情相关
  '色情', '黄色', '性交', '性爱', '性虐待',
  // 暴力相关
  '暴力', '杀害', '谋杀', '轰炸', '恐怖',
  // 广告营销
  '微商', '传销', '代理', '加盟', '投资',
  // 其他
  '垃圾', '废物', '猪头', '混蛋'
];

// 构建敏感词树（Trie树），用于高效检测
class SensitiveWordDetector {
  constructor(words = SENSITIVE_WORDS) {
    this.trie = {};
    this.buildTrie(words);
  }

  // 构建 Trie 树
  buildTrie(words) {
    words.forEach(word => {
      let node = this.trie;
      for (let char of word) {
        if (!node[char]) {
          node[char] = { isEnd: false };
        }
        node = node[char];
      }
      node.isEnd = true;
    });
  }

  // 检查文本是否包含敏感词
  contains(text) {
    if (!text) return false;
    const len = text.length;

    for (let i = 0; i < len; i++) {
      let node = this.trie;
      let j = i;
      let matched = '';

      while (j < len && node[text[j]]) {
        matched += text[j];
        node = node[text[j]];
        if (node.isEnd) {
          return true;
        }
        j++;
      }
    }
    return false;
  }

  // 查找第一个敏感词
  findFirst(text) {
    if (!text) return null;
    const len = text.length;

    for (let i = 0; i < len; i++) {
      let node = this.trie;
      let j = i;
      let matched = '';

      while (j < len && node[text[j]]) {
        matched += text[j];
        node = node[text[j]];
        if (node.isEnd) {
          return {
            word: matched,
            index: i,
            length: matched.length
          };
        }
        j++;
      }
    }
    return null;
  }

  // 查找所有敏感词
  findAll(text) {
    if (!text) return [];
    const results = [];
    const len = text.length;

    for (let i = 0; i < len; i++) {
      let node = this.trie;
      let j = i;
      let matched = '';

      while (j < len && node[text[j]]) {
        matched += text[j];
        node = node[text[j]];
        if (node.isEnd) {
          results.push({
            word: matched,
            index: i,
            length: matched.length
          });
        }
        j++;
      }
    }
    return results;
  }

  // 替换敏感词
  replace(text, replacement = '*') {
    if (!text) return text;
    let result = text;
    const matches = this.findAll(text);

    // 从后往前替换，避免索引变化
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const replaceStr = replacement.repeat(match.length);
      result = result.substring(0, match.index) +
               replaceStr +
               result.substring(match.index + match.length);
    }
    return result;
  }
}

// 初始化检测器
const detector = new SensitiveWordDetector();

/**
 * 主 API 处理函数
 */
export default function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { action, text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '文本参数缺失或格式错误' });
  }

  try {
    let result;

    switch (action) {
      // 检查是否包含敏感词
      case 'contains':
        result = {
          action: 'contains',
          text,
          hasSensitive: detector.contains(text),
          timestamp: new Date().toISOString()
        };
        break;

      // 查找第一个敏感词
      case 'findFirst':
        result = {
          action: 'findFirst',
          text,
          firstMatch: detector.findFirst(text),
          timestamp: new Date().toISOString()
        };
        break;

      // 查找所有敏感词
      case 'findAll':
        result = {
          action: 'findAll',
          text,
          matches: detector.findAll(text),
          totalMatches: detector.findAll(text).length,
          timestamp: new Date().toISOString()
        };
        break;

      // 替换敏感词
      case 'replace':
        const replacement = req.body.replacement || '*';
        result = {
          action: 'replace',
          originalText: text,
          replacement,
          replacedText: detector.replace(text, replacement),
          matchCount: detector.findAll(text).length,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        return res.status(400).json({ error: '不支持的操作' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('敏感词检测错误:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: error.message
    });
  }
}
