import express from 'express';
import { query, queryOne, run } from '../models/database.js';
import { requireUser } from '../middleware/auth.js';
import {
  analyzeRequirements,
  clarifyRequirement,
  searchLocalMaterials,
  assessRelevance,
  extractTopics,
  findConnections,
  generateReport
} from '../services/research-service.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(requireUser);

// 获取项目列表
router.get('/projects', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [req.user.id];
    const whereClauses = ['user_id = ?'];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereClause = whereClauses.join(' AND ');

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM research_projects WHERE ${whereClause}`,
      params
    );

    const projects = await query(
      `SELECT * FROM research_projects
       WHERE ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // 获取每个项目的统计信息
    for (const project of projects) {
      const stats = await queryOne(
        `SELECT
          (SELECT COUNT(*) FROM research_questions WHERE project_id = ?) as question_count,
          (SELECT COUNT(*) FROM research_materials WHERE project_id = ?) as material_count
        `,
        [project.id, project.id]
      );
      project.stats = stats;
    }

    res.json({
      data: projects,
      total: countResult.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get research projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取项目详情
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 获取问题列表
    const questions = await query(
      'SELECT * FROM research_questions WHERE project_id = ? ORDER BY order_index',
      [id]
    );

    // 获取资料列表
    const materials = await query(
      'SELECT * FROM research_materials WHERE project_id = ? ORDER BY relevance_score DESC',
      [id]
    );

    project.questions = questions;
    project.materials = materials;

    res.json(project);
  } catch (error) {
    logger.error('Get research project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建项目
router.post('/projects', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await run(
      `INSERT INTO research_projects (user_id, title, description, status)
       VALUES (?, ?, ?, 'draft')`,
      [req.user.id, title, description || '']
    );

    res.status(201).json({
      id: result.lastID,
      message: 'Project created successfully'
    });
  } catch (error) {
    logger.error('Create research project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新项目
router.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const existing = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, req.user.id);

    if (updates.length > 0) {
      await run(
        `UPDATE research_projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );
    }

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    logger.error('Update research project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除项目
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await run('DELETE FROM research_projects WHERE id = ? AND user_id = ?', [id, req.user.id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete research project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 开始需求分析
router.post('/projects/:id/analyze-requirements', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info(`[Research] 开始需求分析: ${project.title}`);

    const result = await analyzeRequirements(project.title, project.description);

    if (!result) {
      return res.status(503).json({ error: 'AI Service unavailable' });
    }

    // 保存生成的问题
    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];
      await run(
        `INSERT INTO research_questions (project_id, question, status, order_index)
         VALUES (?, ?, 'pending', ?)`,
        [id, q.question, q.order || i + 1]
      );
    }

    // 更新项目状态
    await run(
      'UPDATE research_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['analyzing', id]
    );

    res.json({
      questions: result.questions,
      searchQueries: result.searchQueries
    });
  } catch (error) {
    logger.error('Analyze requirements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 回答问题并继续分析
router.post('/projects/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, answer } = req.body;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const question = await queryOne(
      'SELECT * FROM research_questions WHERE id = ? AND project_id = ?',
      [questionId, id]
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // 保存答案
    await run(
      'UPDATE research_questions SET answer = ?, status = ? WHERE id = ?',
      [answer, 'answered', questionId]
    );

    // 分析是否需要更多问题
    const result = await clarifyRequirement(id, question.question, answer);

    if (result && result.needMoreInfo && result.questions.length > 0) {
      // 获取当前最大的order_index
      const maxOrder = await queryOne(
        'SELECT MAX(order_index) as max_order FROM research_questions WHERE project_id = ?',
        [id]
      );

      const startOrder = (maxOrder.max_order || 0) + 1;

      // 添加新问题
      for (let i = 0; i < result.questions.length; i++) {
        const q = result.questions[i];
        await run(
          `INSERT INTO research_questions (project_id, question, status, order_index)
           VALUES (?, ?, 'pending', ?)`,
          [id, q.question, startOrder + i]
        );
      }
    }

    res.json({
      needMoreInfo: result?.needMoreInfo || false,
      newQuestions: result?.questions || []
    });
  } catch (error) {
    logger.error('Answer question error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 开始收集资料
router.post('/projects/:id/collect-materials', async (req, res) => {
  try {
    const { id } = req.params;
    const { scope = 'local' } = req.body; // local, network, all

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 获取搜索关键词（从问题中提取）
    const questions = await query(
      'SELECT * FROM research_questions WHERE project_id = ?',
      [id]
    );

    const searchQueries = questions.map(q => q.question);

    logger.info(`[Research] 开始收集资料: ${project.title}, scope: ${scope}`);

    let materials = [];

    // 搜索本地内容
    if (scope === 'local' || scope === 'all') {
      const localMaterials = await searchLocalMaterials(req.user.id, searchQueries);
      materials = materials.concat(localMaterials);
    }

    // 评估相关性并保存
    for (const material of materials) {
      const relevanceScore = await assessRelevance(material, project.title, questions);

      await run(
        `INSERT INTO research_materials (project_id, type, source, title, content, relevance_score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, material.type, material.source, material.title, material.content, relevanceScore]
      );
    }

    // 更新项目状态
    await run(
      'UPDATE research_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['researching', id]
    );

    res.json({
      message: 'Materials collected successfully',
      count: materials.length
    });
  } catch (error) {
    logger.error('Collect materials error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 处理资料（提取主题、发现关联）
router.post('/projects/:id/process-materials', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info(`[Research] 开始处理资料: ${project.title}`);

    // 获取所有资料
    const materials = await query(
      'SELECT * FROM research_materials WHERE project_id = ?',
      [id]
    );

    if (materials.length === 0) {
      return res.status(400).json({ error: 'No materials to process' });
    }

    // 发现资料之间的关联
    const connections = await findConnections(materials);

    // 保存关联关系
    for (const conn of connections) {
      const fromMaterial = materials[conn.from];
      const toMaterial = materials[conn.to];

      if (fromMaterial && toMaterial) {
        await run(
          `INSERT INTO research_connections
           (project_id, material_id, connected_material_id, connection_type, strength)
           VALUES (?, ?, ?, ?, ?)`,
          [id, fromMaterial.id, toMaterial.id, conn.type, conn.strength]
        );
      }
    }

    // 更新项目状态
    await run(
      'UPDATE research_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['analyzing', id]
    );

    res.json({
      message: 'Materials processed successfully',
      connectionsCount: connections.length
    });
  } catch (error) {
    logger.error('Process materials error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取知识图谱数据
router.get('/projects/:id/knowledge-graph', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 获取资料（节点）
    const materials = await query(
      'SELECT * FROM research_materials WHERE project_id = ?',
      [id]
    );

    // 获取关联（边）
    const connections = await query(
      'SELECT * FROM research_connections WHERE project_id = ?',
      [id]
    );

    // 构建图谱数据
    const nodes = materials.map(m => ({
      id: m.id,
      label: m.title,
      type: m.type,
      relevance: m.relevance_score,
      content: m.content.substring(0, 200)
    }));

    const edges = connections.map(c => ({
      from: c.material_id,
      to: c.connected_material_id,
      type: c.connection_type,
      strength: c.strength
    }));

    res.json({
      nodes,
      edges
    });
  } catch (error) {
    logger.error('Get knowledge graph error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 生成研究报告
router.post('/projects/:id/generate-report', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info(`[Research] 生成研究报告: ${project.title}`);

    const report = await generateReport(id);

    if (!report) {
      return res.status(503).json({ error: 'AI Service unavailable' });
    }

    // 更新项目状态
    await run(
      'UPDATE research_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['done', id]
    );

    res.json({
      report
    });
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取资料列表
router.get('/projects/:id/materials', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const project = await queryOne(
      'SELECT * FROM research_projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const params = [id];
    const whereClauses = ['project_id = ?'];

    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereClause = whereClauses.join(' AND ');

    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM research_materials WHERE ${whereClause}`,
      params
    );

    const materials = await query(
      `SELECT * FROM research_materials
       WHERE ${whereClause}
       ORDER BY relevance_score DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      data: materials,
      total: countResult.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get materials error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
