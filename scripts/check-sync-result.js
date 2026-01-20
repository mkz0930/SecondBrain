import fetch from 'node-fetch';

async function checkSyncResult() {
  try {
    console.log('正在获取内容列表...\n');

    const response = await fetch('http://127.0.0.1:3000/api/contents');
    const result = await response.json();

    console.log('API响应:', JSON.stringify(result).substring(0, 200));

    if (!result.success && !result.data) {
      console.error('获取内容失败:', result.message || '未知错误');
      return;
    }

    const contents = result.data;
    console.log(`📊 总内容数: ${contents.length}\n`);

    // 统计分析
    const stats = {
      total: contents.length,
      withContent: contents.filter(c => c.content && c.content.trim().length > 0).length,
      withSummary: contents.filter(c => c.summary && c.summary.trim().length > 0).length,
      emptyContent: contents.filter(c => !c.content || c.content.trim().length === 0).length,
      byType: {}
    };

    contents.forEach(c => {
      const type = c.type || '未分类';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    console.log('📈 统计信息:');
    console.log(`  - 有内容: ${stats.withContent} 条`);
    console.log(`  - 有摘要: ${stats.withSummary} 条`);
    console.log(`  - 空内容: ${stats.emptyContent} 条`);
    console.log('\n📑 按类型分布:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} 条`);
    });

    // 显示最近10条记录
    console.log('\n📝 最近10条记录:');
    const recent = contents.slice(0, 10);
    recent.forEach(c => {
      const contentPreview = c.content
        ? c.content.substring(0, 50).replace(/\n/g, ' ') + '...'
        : '【无内容】';
      console.log(`  ID ${c.id}: ${c.title}`);
      console.log(`    类型: ${c.type || '未知'} | 内容: ${contentPreview}`);
      if (c.summary) {
        console.log(`    摘要: ${c.summary.substring(0, 60)}...`);
      }
      console.log('');
    });

    // 检查是否还有"空记录"
    const emptyRecords = contents.filter(c =>
      c.title?.includes('空记录') ||
      (!c.content || c.content.trim().length === 0)
    );

    if (emptyRecords.length > 0) {
      console.log(`⚠️  发现 ${emptyRecords.length} 条空记录或标题包含"空记录"的内容:`);
      emptyRecords.slice(0, 5).forEach(c => {
        console.log(`  - ID ${c.id}: ${c.title} (内容长度: ${c.content?.length || 0})`);
      });
    } else {
      console.log('✅ 没有发现空记录！');
    }

  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkSyncResult();
