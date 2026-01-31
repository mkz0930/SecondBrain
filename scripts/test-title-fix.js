import dotenv from 'dotenv';
dotenv.config();

import { query, queryOne, run } from '../server/models/database.js';
import logger from '../server/utils/logger.js';

/**
 * 测试标题自动修复功能
 */
async function testTitleFix() {
  console.log('=== 测试标题自动修复功能 ===\n');

  // 1. 创建一个无意义标题的测试内容
  const testContent = {
    title: 'https://example.com/test-article',
    content: '这是一篇关于人工智能在医疗领域应用的深度分析文章，探讨了AI如何改变诊断流程和治疗方案。机器学习算法可以帮助医生更准确地识别疾病，提高诊断效率。',
    type: '文章',
    user_id: 2
  };

  console.log('1. 创建测试内容...');
  console.log(`   原始标题: "${testContent.title}"`);

  const result = await run(
    'INSERT INTO contents (title, content, type, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [testContent.title, testContent.content, testContent.type, testContent.user_id]
  );

  const contentId = result.lastID;
  console.log(`   创建成功，ID: ${contentId}\n`);

  // 2. 模拟 PUT 更新（触发标题修复）
  console.log('2. 模拟 PUT 更新请求...');

  // 导入 needsTitleFix 函数逻辑
  function needsTitleFix(title) {
    if (!title || title.trim() === '') return true;
    const trimmed = title.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
    const invalidTitles = ['未命名笔记', '未命名', 'New Note', '[image]', '无标题', '输入内容缺失', '解析失败', '-'];
    if (invalidTitles.includes(trimmed)) return true;
    const invalidPrefixes = ['#!/bin', '原创 ', '关注前沿'];
    if (invalidPrefixes.some(prefix => trimmed.startsWith(prefix))) return true;
    if (trimmed.length < 2) return true;
    return false;
  }

  const needsFix = needsTitleFix(testContent.title);
  console.log(`   标题需要修复: ${needsFix}`);

  if (needsFix) {
    console.log('   调用 AI 分析生成新标题...');

    // 动态导入 AI 服务
    const { analyzeContent } = await import('../server/services/ai-service.js');

    try {
      const aiResult = await analyzeContent(testContent.content, null);

      if (aiResult && aiResult.title && !needsTitleFix(aiResult.title)) {
        await run(
          'UPDATE contents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [aiResult.title, contentId]
        );
        console.log(`   AI 生成的新标题: "${aiResult.title}"`);
        console.log('   标题修复成功!\n');
      } else {
        console.log('   AI 未能生成有效标题\n');
      }
    } catch (error) {
      console.error('   AI 分析失败:', error.message);
    }
  }

  // 3. 验证结果
  console.log('3. 验证结果...');
  const updated = await queryOne('SELECT id, title, content FROM contents WHERE id = ?', [contentId]);
  console.log(`   最终标题: "${updated.title}"`);
  console.log(`   标题是否有效: ${!needsTitleFix(updated.title)}\n`);

  // 4. 清理测试数据
  console.log('4. 清理测试数据...');
  await run('DELETE FROM contents WHERE id = ?', [contentId]);
  console.log('   测试内容已删除\n');

  console.log('=== 测试完成 ===');
}

testTitleFix().catch(console.error);
