/**
 * URL 验证和过滤工具
 */

// 文章平台白名单
const ARTICLE_PATTERNS = [
  /mp\.weixin\.qq\.com/i, // 微信公众号
  /zhihu\.com\/p\//i, // 知乎文章
  /juejin\.cn\/post\//i, // 掘金
  /jianshu\.com\/p\//i, // 简书
  /csdn\.net\/.*\/article/i, // CSDN
  /segmentfault\.com\/a\//i, // SegmentFault
  /medium\.com\//i, // Medium
  /substack\.com\//i, // Substack
  /blog\./i, // 博客
  /article/i, // 包含 article 的 URL
];

// 排除的 URL 模式
const EXCLUDE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i, // 图片
  /\.(mp4|avi|mov|wmv|flv|mkv)$/i, // 视频
  /\.(mp3|wav|ogg|flac|aac)$/i, // 音频
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i, // 文档
  /\.(zip|rar|7z|tar|gz)$/i, // 压缩包
  /youtube\.com\/watch/i, // YouTube 视频
  /bilibili\.com\/video/i, // B站视频
  /douyin\.com/i, // 抖音
  /taobao\.com|tmall\.com|jd\.com/i, // 电商
  /localhost|127\.0\.0\.1/i, // 本地地址
];

/**
 * 验证是否为有效的 URL
 */
export function isValidURL(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();

  // 基础 URL 正则
  const urlRegex = /^https?:\/\/.+/i;
  if (!urlRegex.test(trimmed)) {
    return false;
  }

  // 尝试解析 URL
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * 判断 URL 是否应该被处理
 */
export function shouldProcessURL(url) {
  if (!url) {
    return false;
  }

  // 检查是否在排除列表中
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(url)) {
      console.log('[URLValidator] URL excluded by pattern:', pattern);
      return false;
    }
  }

  // 检查是否匹配文章平台
  for (const pattern of ARTICLE_PATTERNS) {
    if (pattern.test(url)) {
      console.log('[URLValidator] URL matched article pattern:', pattern);
      return true;
    }
  }

  // 启发式判断：URL 长度和路径结构
  try {
    const urlObj = new URL(url);
    const pathLength = urlObj.pathname.length;

    // 如果路径较长（可能是文章），允许处理
    if (pathLength > 10) {
      console.log('[URLValidator] URL has long path, allowing');
      return true;
    }

    // 如果有查询参数（可能是文章），允许处理
    if (urlObj.search.length > 0) {
      console.log('[URLValidator] URL has query params, allowing');
      return true;
    }
  } catch (e) {
    console.error('[URLValidator] Error parsing URL:', e);
  }

  // 默认不处理
  console.log('[URLValidator] URL does not match any criteria, ignoring');
  return false;
}

/**
 * 提取 URL 的域名
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}
