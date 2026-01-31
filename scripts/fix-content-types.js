/**
 * 修复本地数据库中内容的分类
 * 根据标题和URL自动识别正确的类型
 */

import { query, run } from '../server/models/database.js';
import logger from '../server/utils/logger.js';

// 类型识别规则
const typeRules = [
  {
    type: '抖音',
    patterns: {
      title: [/抖音/, /复制打开/, /douyin/i],
      url: [/douyin\.com/, /v\.douyin\.com/]
    }
  },
  {
    type: '公众号',
    patterns: {
      title: [/公众号/, /微信/],
      url: [/mp\.weixin\.qq\.com/, /weixin\.qq\.com/]
    }
  },
  {
    type: 'B站',
    patterns: {
      title: [/B站/, /bilibili/, /哔哩哔哩/i],
      url: [/bilibili\.com/, /b23\.tv/]
    }
  },
  {
    type: '文档',
    patterns: {
      title: [/文档/, /笔记/, /教程/, /指南/],
      url: [/notion\.so/, /yuque\.com/, /feishu\.cn/, /docs\.google/]
    }
  }
];

/**
 * 根据标题和URL识别内容类型
 */
function detectType(title, url, currentType) {
  // 如果当前类型已经是新类型之一，不需要修改
  const newTypes = ['随便', '抖音', '公众号', '文档', 'B站', '其他'];
  if (newTypes.includes(currentType)) {
    return currentType;
  }

  // 遍历规则进行匹配
  for (const rule of typeRules) {
    // 检查标题匹配
    if (title && rule.patterns.title) {
      for (const pattern of rule.patterns.title) {
        if (pattern.test(title)) {
          return rule.type;
        }
      }
    }

    // 检查URL匹配
    if (url && rule.patterns.url) {
      for (const pattern of rule.patterns.url) {
        if (pattern.test(url)) {
          return rule.type;
        }
      }
    }
  }

  // 如果没有匹配到任何规则，保持原类型
  return currentType;
}

async function fixContentTypes() {
  console.log('开始修复内容分类...\n');

  // 获取所有需要检查的内容
  const contents = await query(`
    SELECT id, title, type, url, source
    FROM contents
    WHERE deleted_at IS NULL
  `);

  console.log(`共找到 ${contents.length} 条内容\n`);

  let fixedCount = 0;
  const fixes = [];

  for (const content of contents) {
    const url = content.url || content.source || '';
    const newType = detectType(content.title, url, content.type);

    if (newType !== content.type) {
      fixes.push({
        id: content.id,
        title: content.title?.substring(0, 40),
        oldType: content.type,
        newType: newType,
        url: url?.substring(0, 50)
      });

      // 更新数据库
      await run(
        'UPDATE contents SET type = ?, updated_at = ? WHERE id = ?',
        [newType, new Date().toISOString(), content.id]
      );

      fixedCount++;
    }
  }

  // 输出修复结果
  console.log('=== 修复结果 ===\n');

  if (fixes.length === 0) {
    console.log('没有需要修复的内容');
  } else {
    console.log(`共修复 ${fixedCount} 条内容:\n`);
    fixes.forEach(fix => {
      console.log(`ID: ${fix.id}`);
      console.log(`  标题: ${fix.title}`);
      console.log(`  类型: ${fix.oldType} -> ${fix.newType}`);
      if (fix.url) console.log(`  URL: ${fix.url}`);
      console.log('');
    });
  }

  // 统计修复后的类型分布
  const typeStats = await query(`
    SELECT type, COUNT(*) as count
    FROM contents
    WHERE deleted_at IS NULL
    GROUP BY type
    ORDER BY count DESC
  `);

  console.log('\n=== 修复后的类型分布 ===');
  typeStats.forEach(stat => {
    console.log(`  ${stat.type || '(空)'}: ${stat.count} 条`);
  });

  console.log('\n修复完成！请运行强制同步将更改推送到飞书。');
}

// 运行修复
fixContentTypes().catch(err => {
  console.error('修复失败:', err);
  process.exit(1);
});
