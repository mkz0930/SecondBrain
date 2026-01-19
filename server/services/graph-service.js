import { query, queryOne } from '../models/database.js'
import logger from '../utils/logger.js'

/**
 * 图谱服务 - 处理知识图谱数据生成和关联分析
 */
class GraphService {
  /**
   * 获取用户的完整图谱数据
   * @param {number} userId - 用户ID
   * @param {Object} options - 筛选选项
   * @returns {Promise<Object>} 图谱数据 {nodes, edges}
   */
  async getGraphData(userId, options = {}) {
    try {
      const {
        contentTypes = [],
        tagIds = [],
        startDate = null,
        endDate = null,
        minConnections = 0
      } = options;

      // 1. 获取内容节点
      const contents = await this.getContentNodes(userId, { contentTypes, tagIds, startDate, endDate });

      // 2. 获取标签节点
      const tags = await this.getTagNodes(userId, tagIds);

      // 3. 构建节点数组
      const nodes = [
        ...contents.map(c => ({
          id: `content-${c.id}`,
          name: c.title || '无标题',
          type: 'content',
          category: this.getContentCategory(c.type),
          value: c.rating || 3,
          symbolSize: this.calculateNodeSize(c),
          itemStyle: {
            color: this.getContentColor(c.type)
          },
          data: {
            id: c.id,
            type: c.type,
            source: c.source,
            rating: c.rating,
            is_favorite: c.is_favorite,
            created_at: c.created_at,
            tag_count: c.tag_count || 0
          }
        })),
        ...tags.map(t => ({
          id: `tag-${t.id}`,
          name: t.name,
          type: 'tag',
          category: 'tag',
          value: t.content_count || 1,
          symbolSize: this.calculateTagSize(t.content_count),
          itemStyle: {
            color: t.color || '#8B5CF6'
          },
          data: {
            id: t.id,
            content_count: t.content_count || 0
          }
        }))
      ];

      // 4. 构建边（关联关系）
      const edges = [];

      // 4.1 内容-标签关联
      const contentTagEdges = await this.getContentTagEdges(userId, { contentTypes, tagIds, startDate, endDate });
      edges.push(...contentTagEdges);

      // 4.2 内容-内容关联（基于标签共现）
      const contentContentEdges = await this.getContentContentEdges(contents, minConnections);
      edges.push(...contentContentEdges);

      // 4.3 内容-内容关联（基于关键词）
      const keywordEdges = await this.getKeywordBasedEdges(contents);
      edges.push(...keywordEdges);

      logger.info(`Generated graph data for user ${userId}: ${nodes.length} nodes, ${edges.length} edges`);

      return {
        nodes,
        edges,
        categories: this.getCategories(),
        stats: {
          contentCount: contents.length,
          tagCount: tags.length,
          edgeCount: edges.length
        }
      };
    } catch (error) {
      logger.error('Error generating graph data:', error);
      throw error;
    }
  }

  /**
   * 获取内容节点
   */
  async getContentNodes(userId, filters) {
    const { contentTypes, tagIds, startDate, endDate } = filters;

    let queryStr = `
      SELECT
        c.*,
        COUNT(DISTINCT ct.tag_id) as tag_count
      FROM contents c
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      WHERE c.user_id = ? AND c.deleted_at IS NULL
    `;
    const params = [userId];

    if (contentTypes.length > 0) {
      queryStr += ` AND c.type IN (${contentTypes.map(() => '?').join(',')})`;
      params.push(...contentTypes);
    }

    if (tagIds.length > 0) {
      queryStr += ` AND c.id IN (
        SELECT content_id FROM content_tags WHERE tag_id IN (${tagIds.map(() => '?').join(',')})
      )`;
      params.push(...tagIds);
    }

    if (startDate) {
      queryStr += ` AND c.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      queryStr += ` AND c.created_at <= ?`;
      params.push(endDate);
    }

    queryStr += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const rows = await query(queryStr, params);
    return rows || [];
  }

  /**
   * 获取标签节点
   */
  async getTagNodes(userId, tagIds = []) {
    let queryStr = `
      SELECT
        t.*,
        COUNT(ct.content_id) as content_count
      FROM tags t
      LEFT JOIN content_tags ct ON t.id = ct.tag_id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (tagIds.length > 0) {
      queryStr += ` AND t.id IN (${tagIds.map(() => '?').join(',')})`;
      params.push(...tagIds);
    }

    queryStr += ` GROUP BY t.id`;

    const rows = await query(queryStr, params);
    return rows || [];
  }

  /**
   * 获取内容-标签边
   */
  async getContentTagEdges(userId, filters) {
    const { contentTypes, tagIds, startDate, endDate } = filters;

    let queryStr = `
      SELECT
        ct.content_id,
        ct.tag_id
      FROM content_tags ct
      INNER JOIN contents c ON ct.content_id = c.id
      WHERE c.user_id = ? AND c.deleted_at IS NULL
    `;
    const params = [userId];

    if (contentTypes.length > 0) {
      queryStr += ` AND c.type IN (${contentTypes.map(() => '?').join(',')})`;
      params.push(...contentTypes);
    }

    if (tagIds.length > 0) {
      queryStr += ` AND ct.tag_id IN (${tagIds.map(() => '?').join(',')})`;
      params.push(...tagIds);
    }

    if (startDate) {
      queryStr += ` AND c.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      queryStr += ` AND c.created_at <= ?`;
      params.push(endDate);
    }

    const rows = await query(queryStr, params);
    const edges = (rows || []).map(row => ({
      source: `content-${row.content_id}`,
      target: `tag-${row.tag_id}`,
      type: 'content-tag',
      lineStyle: {
        color: '#94A3B8',
        width: 1,
        type: 'solid'
      }
    }));
    return edges;
  }

  /**
   * 获取内容-内容边（基于标签共现）
   */
  async getContentContentEdges(contents, minConnections = 1) {
    const edges = [];
    const contentTagMap = new Map();

    // 构建内容-标签映射
    const queryStr = `
      SELECT content_id, tag_id
      FROM content_tags
      WHERE content_id IN (${contents.map(() => '?').join(',')})
    `;
    const params = contents.map(c => c.id);

    const contentTags = await query(queryStr, params);

    // 构建映射
    contentTags.forEach(ct => {
      if (!contentTagMap.has(ct.content_id)) {
        contentTagMap.set(ct.content_id, new Set());
      }
      contentTagMap.get(ct.content_id).add(ct.tag_id);
    });

    // 计算内容之间的标签共现
    for (let i = 0; i < contents.length; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const tags1 = contentTagMap.get(contents[i].id) || new Set();
        const tags2 = contentTagMap.get(contents[j].id) || new Set();

        const commonTags = new Set([...tags1].filter(t => tags2.has(t)));

        if (commonTags.size >= minConnections) {
          edges.push({
            source: `content-${contents[i].id}`,
            target: `content-${contents[j].id}`,
            type: 'content-content-tag',
            value: commonTags.size,
            lineStyle: {
              color: '#60A5FA',
              width: Math.min(commonTags.size, 5),
              type: 'dashed',
              opacity: 0.6
            },
            label: {
              show: commonTags.size >= 3,
              formatter: `${commonTags.size}个共同标签`
            }
          });
        }
      }
    }

    return edges;
  }

  /**
   * 获取基于关键词的内容关联
   */
  async getKeywordBasedEdges(contents) {
    const edges = [];

    // 提取每个内容的关键词
    const contentKeywords = contents.map(c => ({
      id: c.id,
      keywords: this.extractKeywords(c.title, c.content, c.summary)
    }));

    // 计算关键词相似度
    for (let i = 0; i < contentKeywords.length; i++) {
      for (let j = i + 1; j < contentKeywords.length; j++) {
        const similarity = this.calculateKeywordSimilarity(
          contentKeywords[i].keywords,
          contentKeywords[j].keywords
        );

        // 相似度阈值：0.3
        if (similarity >= 0.3) {
          edges.push({
            source: `content-${contentKeywords[i].id}`,
            target: `content-${contentKeywords[j].id}`,
            type: 'content-content-keyword',
            value: similarity,
            lineStyle: {
              color: '#34D399',
              width: Math.max(1, similarity * 4),
              type: 'dotted',
              opacity: 0.5
            },
            label: {
              show: similarity >= 0.5,
              formatter: `${Math.round(similarity * 100)}%相似`
            }
          });
        }
      }
    }

    return edges;
  }

  /**
   * 提取关键词（简单实现）
   */
  extractKeywords(title = '', content = '', summary = '') {
    const text = `${title} ${summary} ${content}`.toLowerCase();

    // 移除标点符号和特殊字符
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ');

    // 分词（简单按空格分割）
    const words = cleanText.split(/\s+/).filter(w => w.length >= 2);

    // 统计词频
    const wordFreq = new Map();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // 返回前20个高频词
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * 计算关键词相似度（Jaccard相似度）
   */
  calculateKeywordSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = new Set([...set1].filter(k => set2.has(k)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 计算节点大小
   */
  calculateNodeSize(content) {
    let size = 30; // 基础大小

    if (content.is_favorite) size += 10;
    if (content.rating >= 4) size += 5;
    if (content.tag_count > 3) size += content.tag_count * 2;

    return Math.min(size, 80); // 最大80
  }

  /**
   * 计算标签节点大小
   */
  calculateTagSize(contentCount) {
    return Math.min(20 + contentCount * 3, 60);
  }

  /**
   * 获取内容类型对应的分类索引
   */
  getContentCategory(type) {
    const categoryMap = {
      '随笔': 0,
      '文章': 1,
      '音视频': 2,
      '书籍': 3,
      '随便': 4,
      '抖音': 5,
      '公众号': 6,
      '文档': 7,
      '其他': 8
    };
    return categoryMap[type] || 8;
  }

  /**
   * 获取内容类型颜色
   */
  getContentColor(type) {
    const colorMap = {
      '随笔': '#F59E0B',
      '文章': '#3B82F6',
      '音视频': '#EF4444',
      '书籍': '#10B981',
      '随便': '#8B5CF6',
      '抖音': '#EC4899',
      '公众号': '#06B6D4',
      '文档': '#6366F1',
      '其他': '#6B7280'
    };
    return colorMap[type] || '#6B7280';
  }

  /**
   * 获取图表分类配置
   */
  getCategories() {
    return [
      { name: '随笔', itemStyle: { color: '#F59E0B' } },
      { name: '文章', itemStyle: { color: '#3B82F6' } },
      { name: '音视频', itemStyle: { color: '#EF4444' } },
      { name: '书籍', itemStyle: { color: '#10B981' } },
      { name: '随便', itemStyle: { color: '#8B5CF6' } },
      { name: '抖音', itemStyle: { color: '#EC4899' } },
      { name: '公众号', itemStyle: { color: '#06B6D4' } },
      { name: '文档', itemStyle: { color: '#6366F1' } },
      { name: '其他', itemStyle: { color: '#6B7280' } },
      { name: 'tag', itemStyle: { color: '#8B5CF6' } }
    ];
  }

  /**
   * 获取节点详情
   */
  async getNodeDetail(userId, nodeId) {
    const [type, id] = nodeId.split('-');

    if (type === 'content') {
      return this.getContentDetail(userId, parseInt(id));
    } else if (type === 'tag') {
      return this.getTagDetail(userId, parseInt(id));
    }

    throw new Error('Invalid node type');
  }

  /**
   * 获取内容详情
   */
  async getContentDetail(userId, contentId) {
    const queryStr = `
      SELECT c.*, GROUP_CONCAT(t.name) as tags
      FROM contents c
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = ? AND c.user_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
    `;

    const row = await queryOne(queryStr, [contentId, userId]);
    return row;
  }

  /**
   * 获取标签详情
   */
  async getTagDetail(userId, tagId) {
    const queryStr = `
      SELECT
        t.*,
        COUNT(ct.content_id) as content_count,
        GROUP_CONCAT(c.title) as content_titles
      FROM tags t
      LEFT JOIN content_tags ct ON t.id = ct.tag_id
      LEFT JOIN contents c ON ct.content_id = c.id AND c.deleted_at IS NULL
      WHERE t.id = ? AND t.user_id = ?
      GROUP BY t.id
    `;

    const row = await queryOne(queryStr, [tagId, userId]);
    return row;
  }

  /**
   * 获取相关节点推荐
   */
  async getRelatedNodes(userId, nodeId, limit = 10) {
    const [type, id] = nodeId.split('-');

    if (type === 'content') {
      return this.getRelatedContents(userId, parseInt(id), limit);
    } else if (type === 'tag') {
      return this.getRelatedTags(userId, parseInt(id), limit);
    }

    return [];
  }

  /**
   * 获取相关内容
   */
  async getRelatedContents(userId, contentId, limit) {
    // 基于共同标签推荐
    const queryStr = `
      SELECT
        c2.id,
        c2.title,
        c2.type,
        COUNT(DISTINCT ct2.tag_id) as common_tags
      FROM content_tags ct1
      INNER JOIN content_tags ct2 ON ct1.tag_id = ct2.tag_id AND ct2.content_id != ct1.content_id
      INNER JOIN contents c2 ON ct2.content_id = c2.id
      WHERE ct1.content_id = ? AND c2.user_id = ? AND c2.deleted_at IS NULL
      GROUP BY c2.id
      ORDER BY common_tags DESC
      LIMIT ?
    `;

    const rows = await query(queryStr, [contentId, userId, limit]);
    return rows || [];
  }

  /**
   * 获取相关标签
   */
  async getRelatedTags(userId, tagId, limit) {
    // 基于共同内容推荐
    const queryStr = `
      SELECT
        t2.id,
        t2.name,
        t2.color,
        COUNT(DISTINCT ct2.content_id) as common_contents
      FROM content_tags ct1
      INNER JOIN content_tags ct2 ON ct1.content_id = ct2.content_id AND ct2.tag_id != ct1.tag_id
      INNER JOIN tags t2 ON ct2.tag_id = t2.id
      WHERE ct1.tag_id = ? AND t2.user_id = ?
      GROUP BY t2.id
      ORDER BY common_contents DESC
      LIMIT ?
    `;

    const rows = await query(queryStr, [tagId, userId, limit]);
    return rows || [];
  }
}

export default new GraphService()
