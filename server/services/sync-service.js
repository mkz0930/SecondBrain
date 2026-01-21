import { query, queryOne, run } from '../models/database.js'
import { FeishuAdapter } from './feishu-adapter.js'
import { syncState } from './sync-state.js'
import { analyzeContent } from './ai-service.js'

/**
 * 同步服务
 * 负责本地与飞书之间的双向同步逻辑
 */

export class SyncService {
  constructor(config, logger = console) {
    this.userId = config.user_id
    this.tableId = config.table_id
    this.adapter = new FeishuAdapter({
      app_id: config.app_id,
      app_secret: config.app_secret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at,
      logger
    })
    this.logger = logger
  }

  /**
   * 执行双向同步
   */
  async performSync(syncType = 'manual', direction = 'both', force = false) {
    const syncId = await this.createSyncLog(syncType)
    const startTime = Date.now()
    
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      conflicts: 0,
      details: []
    }

    try {
      this.logger.info(`[SyncService] 开始飞书同步，用户ID: ${this.userId}，同步类型: ${syncType}，方向: ${direction}，强制: ${force}`)

      // 初始化进度状态
      syncState.set(this.userId, {
        status: 'running',
        stage: 'init',
        message: '正在初始化同步...',
        progress: 0,
        total: 0
      })

      // 刷新token并保存
      const tokenInfo = await this.adapter.refreshAccessToken()
      await this.updateToken(tokenInfo)

      if (direction === 'both' || direction === 'push') {
        // 推送本地变更到飞书
        const pushStats = await this.pushToFeishu()
        stats.total += pushStats.total
        stats.success += pushStats.success
        stats.failed += pushStats.failed
        stats.details.push(...pushStats.details)
      }

      if (direction === 'both' || direction === 'pull') {
        // 拉取飞书变更到本地
        const pullStats = await this.pullFromFeishu(force)
        stats.total += pullStats.total
        stats.success += pullStats.success
        stats.failed += pullStats.failed
        stats.conflicts += pullStats.conflicts
        stats.details.push(...pullStats.details)
      }

      const duration = Date.now() - startTime
      this.logger.info(`[SyncService] 同步完成，总耗时 ${duration}ms`)

      await this.completeSyncLog(syncId, 'success', stats)

      // 更新状态为完成
      syncState.update(this.userId, {
        status: 'finished',
        stage: 'finished',
        message: `同步完成！成功 ${stats.success} 条，失败 ${stats.failed} 条${stats.conflicts > 0 ? `，冲突 ${stats.conflicts} 条` : ''}`,
        progress: 100
      })

      // 更新统计信息
      syncState.updateStats(this.userId, stats)
      
      return {
        sync_id: syncId,
        status: 'success',
        ...stats
      }
    } catch (error) {
      this.logger.error(`[SyncService] 同步失败，用户ID: ${this.userId}，错误:`, error.message)
      
      await this.completeSyncLog(syncId, 'failed', stats, error.message)
      
      // 更新状态为失败
      syncState.update(this.userId, {
        status: 'failed',
        message: `同步失败: ${error.message}`
      })
      
      throw error
    }
  }

  /**
   * 推送本地变更到飞书
   */
  async pushToFeishu() {
    this.logger.info('[SyncService] 开始推送本地变更到飞书')
    
    syncState.update(this.userId, {
      stage: 'pushing',
      message: '正在检测本地变更...'
    })
    
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      details: []
    }

    try {
      // 获取飞书字段列表，用于过滤
      let availableFields = null
      try {
        const [appToken, tableId] = this.tableId.split('_')
        availableFields = await this.adapter.getFields(appToken, tableId)
        this.logger.info(`[SyncService] Fetched ${availableFields.length} fields from Feishu table`)

        // 记录所有字段名称
        const allFieldNames = availableFields.map(f => f.field_name)
        this.logger.info(`[SyncService] Available fields: ${allFieldNames.join(', ')}`)

        // 检查关键字段是否存在
        const requiredFields = ['标题', '内容类型', '内容正文', '更新时间', '记录ID']
        const missingFields = requiredFields.filter(f => !allFieldNames.includes(f))

        if (missingFields.length > 0) {
           this.logger.warn(`[SyncService] Warning: Missing critical fields in Feishu table: ${missingFields.join(', ')}. Sync might be incomplete.`)
        }
      } catch (error) {
        this.logger.warn('[SyncService] Failed to fetch fields from Feishu, proceeding without filtering:', error.message)
      }

      // 检测本地变更
      const changes = await this.detectLocalChanges()
      stats.total = changes.creates.length + changes.updates.length + changes.deletes.length
      
      this.logger.info(`[SyncService] 检测到本地变更 ${stats.total} 条: 新增 ${changes.creates.length}, 更新 ${changes.updates.length}, 删除 ${changes.deletes.length}`)

      syncState.update(this.userId, {
        message: `检测到本地变更 ${stats.total} 条，准备推送...`,
        total: stats.total,
        progress: 0
      })
      
      let processed = 0

      // 处理新增
      if (changes.creates.length > 0) {
        syncState.update(this.userId, { message: `正在推送到飞书 (新增 ${changes.creates.length} 条)...` })
        const createResult = await this.createFeishuRecords(changes.creates, availableFields)
        stats.success += createResult.success
        stats.failed += createResult.failed
        stats.details.push(...createResult.details)
        processed += changes.creates.length
        this.updatePushProgress(processed, stats.total)
      }

      // 处理更新
      if (changes.updates.length > 0) {
        syncState.update(this.userId, { message: `正在推送到飞书 (更新 ${changes.updates.length} 条)...` })
        const updateResult = await this.updateFeishuRecords(changes.updates, availableFields)
        stats.success += updateResult.success
        stats.failed += updateResult.failed
        stats.details.push(...updateResult.details)
        processed += changes.updates.length
        this.updatePushProgress(processed, stats.total)
      }

      // 处理删除
      if (changes.deletes.length > 0) {
        syncState.update(this.userId, { message: `正在推送到飞书 (删除 ${changes.deletes.length} 条)...` })
        const deleteResult = await this.deleteFeishuRecords(changes.deletes)
        stats.success += deleteResult.success
        stats.failed += deleteResult.failed
        stats.details.push(...deleteResult.details)
        processed += changes.deletes.length
        this.updatePushProgress(processed, stats.total)
      }

      this.logger.info(`[SyncService] 推送到飞书：成功 ${stats.success} 条，失败 ${stats.failed} 条`)
      
      return stats
    } catch (error) {
      this.logger.error('[SyncService] 推送到飞书失败:', error.message)
      throw error
    }
  }

  updatePushProgress(processed, total) {
    if (total > 0) {
      const progress = Math.round((processed / total) * 100)
      syncState.update(this.userId, { progress })
    }
  }

  /**
   * 拉取飞书变更到本地
   */
  async pullFromFeishu() {
    this.logger.info('[SyncService] 开始拉取飞书变更到本地')
    
    syncState.update(this.userId, {
      stage: 'pulling',
      message: '正在拉取飞书数据...',
      progress: 0
    })
    
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      conflicts: 0,
      details: []
    }

    try {
      // 获取飞书所有记录
      const feishuRecords = await this.fetchAllFeishuRecords()
      this.logger.info(`[SyncService] 从飞书获取到 ${feishuRecords.length} 条记录`)

      syncState.update(this.userId, {
        message: `获取到 ${feishuRecords.length} 条飞书记录，正在检测变更...`
      })

      // 检测冲突
      const conflicts = await this.detectConflicts(feishuRecords)
      stats.conflicts = conflicts.length
      
      if (conflicts.length > 0) {
        this.logger.warn(`[SyncService] 检测到冲突 ${conflicts.length} 条`)
        syncState.update(this.userId, { message: `正在解决 ${conflicts.length} 个冲突...` })
        
        // 解决冲突：飞书端优先
        const conflictResult = await this.resolveConflicts(conflicts)
        stats.success += conflictResult.success
        stats.failed += conflictResult.failed
        stats.details.push(...conflictResult.details)
      }

      // 检测需要同步的记录
      const changes = await this.detectFeishuChanges(feishuRecords)
      stats.total = changes.creates.length + changes.updates.length
      
      this.logger.info(`[SyncService] 检测到飞书变更 ${stats.total} 条: 新增 ${changes.creates.length}, 更新 ${changes.updates.length}`)

      syncState.update(this.userId, {
        message: `检测到飞书变更 ${stats.total} 条，准备拉取...`,
        total: stats.total,
        progress: 0
      })

      let processed = 0

      // 处理新增
      if (changes.creates.length > 0) {
        syncState.update(this.userId, { message: `正在同步到本地 (新增 ${changes.creates.length} 条)...` })
        const createResult = await this.createLocalContents(changes.creates)
        stats.success += createResult.success
        stats.failed += createResult.failed
        stats.details.push(...createResult.details)
        processed += changes.creates.length
        this.updatePullProgress(processed, stats.total)
      }

      // 处理更新
      if (changes.updates.length > 0) {
        syncState.update(this.userId, { message: `正在同步到本地 (更新 ${changes.updates.length} 条)...` })
        const updateResult = await this.updateLocalContents(changes.updates)
        stats.success += updateResult.success
        stats.failed += updateResult.failed
        stats.details.push(...updateResult.details)
        processed += changes.updates.length
        this.updatePullProgress(processed, stats.total)
      }

      this.logger.info(`[SyncService] 拉取到本地：成功 ${stats.success} 条，失败 ${stats.failed} 条，冲突 ${stats.conflicts} 条`)
      
      return stats
    } catch (error) {
      this.logger.error('[SyncService] 拉取到本地失败:', error.message)
      throw error
    }
  }

  updatePullProgress(processed, total) {
    if (total > 0) {
      const progress = Math.round((processed / total) * 100)
      syncState.update(this.userId, { progress })
    }
  }

  /**
   * 检测本地变更
   */
  async detectLocalChanges() {
    // 新增：本地有但映射表中没有的
    const creates = await query(`
      SELECT c.*, GROUP_CONCAT(t.name) as tag_names
      FROM contents c
      LEFT JOIN feishu_sync_mapping m ON c.id = m.content_id
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.user_id = ? 
        AND c.deleted_at IS NULL 
        AND m.id IS NULL
      GROUP BY c.id
    `, [this.userId])

    // 更新：本地updated_at晚于映射表记录的
    const updates = await query(`
      SELECT c.*, m.feishu_record_id, GROUP_CONCAT(t.name) as tag_names
      FROM contents c
      INNER JOIN feishu_sync_mapping m ON c.id = m.content_id
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.user_id = ? 
        AND c.deleted_at IS NULL
        AND (m.local_updated_at IS NULL OR datetime(c.updated_at) > datetime(m.local_updated_at))
      GROUP BY c.id, m.feishu_record_id
    `, [this.userId])

    // 删除：本地已删除但映射表中还存在的
    const deletes = await query(`
      SELECT c.id, m.feishu_record_id
      FROM contents c
      INNER JOIN feishu_sync_mapping m ON c.id = m.content_id
      WHERE c.user_id = ? 
        AND c.deleted_at IS NOT NULL
        AND datetime(c.deleted_at) > datetime(m.last_sync_at)
    `, [this.userId])

    return { creates, updates, deletes }
  }

  /**
   * 检测飞书变更
   */
  async detectFeishuChanges(feishuRecords) {
    const creates = []
    const updates = []

    for (const record of feishuRecords) {
      const fields = record.fields
      const localId = fields['记录ID'] ? parseInt(fields['记录ID'], 10) : null

      if (!localId) {
        // 飞书新增的记录（没有记录ID）
        creates.push(record)
        continue
      }

      // 检查映射表
      const mapping = await queryOne(
        'SELECT * FROM feishu_sync_mapping WHERE content_id = ?',
        [localId]
      )

      if (!mapping) {
        // 本地不存在映射，需要创建
        creates.push(record)
      } else {
        // 检查飞书更新时间是否晚于映射表记录
        const feishuUpdatedAt = this.adapter.timestampToDate(fields['更新时间'])
        if (feishuUpdatedAt && feishuUpdatedAt > mapping.feishu_updated_at) {
          updates.push(record)
        }
      }
    }

    return { creates, updates }
  }

  /**
   * 检测冲突
   */
  async detectConflicts(feishuRecords) {
    const conflicts = []

    for (const record of feishuRecords) {
      const fields = record.fields
      const localId = fields['记录ID'] ? parseInt(fields['记录ID'], 10) : null
      
      if (!localId) continue

      const mapping = await queryOne(
        'SELECT * FROM feishu_sync_mapping WHERE content_id = ?',
        [localId]
      )

      if (!mapping) continue

      const content = await queryOne(
        'SELECT * FROM contents WHERE id = ? AND user_id = ?',
        [localId, this.userId]
      )

      if (!content) continue

      // 检查是否双方都有更新
      const localUpdated = mapping.local_updated_at && content.updated_at > mapping.local_updated_at
      const feishuUpdatedAt = this.adapter.timestampToDate(fields['更新时间'])
      const feishuUpdated = mapping.feishu_updated_at && feishuUpdatedAt && feishuUpdatedAt > mapping.feishu_updated_at

      if (localUpdated && feishuUpdated) {
        conflicts.push({
          content_id: localId,
          feishu_record_id: record.record_id,
          local_content: content,
          feishu_record: record,
          local_updated_at: content.updated_at,
          feishu_updated_at: feishuUpdatedAt
        })
      }
    }

    return conflicts
  }

  /**
   * 解决冲突
   * 策略：以飞书的记录(content)和附件(attachments)为准，其他字段以本地为准
   */
  async resolveConflicts(conflicts) {
    const stats = { success: 0, failed: 0, details: [] }

    for (const conflict of conflicts) {
      try {
        this.logger.warn(`[SyncService] 检测到冲突，内容ID: ${conflict.content_id}，飞书记录ID: ${conflict.feishu_record_id}`)
        this.logger.info('[SyncService] 应用冲突解决策略：记录和附件以飞书为准，其他字段以本地为准')

        // 1. 获取飞书数据（作为记录和附件的权威源）
        const feishuData = this.adapter.convertFromFeishuRecord(conflict.feishu_record)

        // 2. 获取本地数据（作为其他字段的权威源）
        const localContent = conflict.local_content

        // 3. 获取本地标签（标签以本地为准）
        const localTags = await query(
          `SELECT t.name FROM tags t
           JOIN content_tags ct ON t.id = ct.tag_id
           WHERE ct.content_id = ?`,
          [conflict.content_id]
        )
        const localTagNames = localTags.map(t => t.name)

        // 4. 构造合并数据
        // 使用飞书的 content 和 attachments
        // 使用本地的 title, type, rating, is_favorite, summary, source, tags
        const mergedData = {
          ...localContent, // 基础使用本地数据
          content: feishuData.content, // 内容强制使用飞书
          attachments: feishuData.attachments, // 附件强制使用飞书
          updated_at: feishuData.updated_at, // 更新时间使用飞书的
          tags: localTagNames // 标签使用本地的
        }

        // 5. 更新本地数据库
        await this.updateLocalContent(conflict.content_id, mergedData)

        // 6. 反向更新飞书（将本地的元数据覆盖回飞书，确保飞书元数据也是最新的）
        const tags = mergedData.tags.map(name => ({ name }))
        const recordToUpdate = this.adapter.convertToFeishuRecord(mergedData, tags)

        await this.adapter.updateRecord(
          this.tableId.split('_')[0],
          this.tableId.split('_')[1],
          conflict.feishu_record_id,
          recordToUpdate.fields
        )

        // 7. 更新映射表
        await this.updateMapping(conflict.content_id, conflict.feishu_record_id, mergedData.updated_at, 'merged')

        stats.success++
        stats.details.push({
          type: 'conflict',
          content_id: conflict.content_id,
          resolution: 'merged_content_and_attachments_from_feishu',
          local_updated_at: conflict.local_updated_at,
          feishu_updated_at: conflict.feishu_updated_at
        })

        this.logger.info(`[SyncService] 冲突已解决，本地内容和附件已更新，飞书元数据已修正`)
      } catch (error) {
        this.logger.error(`[SyncService] 冲突解决失败，内容ID: ${conflict.content_id}，错误:`, error.message)
        stats.failed++
        stats.details.push({
          type: 'conflict_error',
          content_id: conflict.content_id,
          error: error.message
        })
      }
    }

    return stats
  }

  /**
   * 创建飞书记录
   */
  async createFeishuRecords(contents, availableFields = null) {
    const stats = { success: 0, failed: 0, details: [] }

    try {
      // 为每个内容获取标签
      const recordsToCreate = []
      for (const content of contents) {
        const tags = content.tag_names ? content.tag_names.split(',').map(name => ({ name })) : []
        const record = this.adapter.convertToFeishuRecord(content, tags, availableFields)
        recordsToCreate.push(record)
      }

      // 批量创建
      const createdRecords = await this.adapter.batchCreateRecords(
        this.tableId.split('_')[0], // app_token
        this.tableId.split('_')[1], // table_id
        recordsToCreate
      )

      // 创建映射关系
      for (let i = 0; i < contents.length; i++) {
        const content = contents[i]
        const record = createdRecords[i]

        if (record && record.record_id) {
          await this.createMapping(content.id, record.record_id, content.updated_at, 'to_feishu')
          stats.success++
          stats.details.push({
            type: 'create',
            content_id: content.id,
            feishu_record_id: record.record_id
          })

          // 添加详细日志
          syncState.update(this.userId, {
            message: `✓ 已创建: ${content.title || '未命名'} (${stats.success}/${contents.length})`
          })
        } else {
          stats.failed++
          stats.details.push({
            type: 'create_error',
            content_id: content.id,
            error: 'Failed to get record_id from response'
          })

          syncState.update(this.userId, {
            message: `✗ 创建失败: ${content.title || '未命名'}`
          })
        }
      }
    } catch (error) {
      this.logger.error('[SyncService] 批量创建飞书记录失败:', error.message)
      stats.failed += contents.length - stats.success
      stats.details.push({
        type: 'batch_create_error',
        error: error.message
      })
    }

    return stats
  }

  /**
   * 更新飞书记录
   */
  async updateFeishuRecords(contents, availableFields = null) {
    const stats = { success: 0, failed: 0, details: [] }

    for (const content of contents) {
      let record = null
      try {
        this.logger.info(`[SyncService] 准备更新飞书记录，内容ID: ${content.id}, 飞书记录ID: ${content.feishu_record_id}`)

        const tags = content.tag_names ? content.tag_names.split(',').map(name => ({ name })) : []
        record = this.adapter.convertToFeishuRecord(content, tags, availableFields)

        this.logger.info(`[SyncService] 更新字段: 标题="${content.title}", 类型="${content.type}", 评分=${content.rating}, 收藏=${content.is_favorite}, 标签=[${tags.map(t => t.name).join(',')}]`)

        await this.adapter.updateRecord(
          this.tableId.split('_')[0],
          this.tableId.split('_')[1],
          content.feishu_record_id,
          record.fields
        )

        await this.updateMapping(content.id, content.feishu_record_id, content.updated_at, 'to_feishu')

        this.logger.info(`[SyncService] 飞书记录更新成功: ${content.feishu_record_id}`)
        stats.success++
        stats.details.push({
          type: 'update',
          content_id: content.id,
          feishu_record_id: content.feishu_record_id
        })

        // 添加详细日志
        syncState.update(this.userId, {
          message: `✓ 已更新: ${content.title || '未命名'} (${stats.success}/${contents.length})`
        })
      } catch (error) {
        // 检查是否是 RecordIdNotFound 错误
        if (error.message.includes('RecordIdNotFound') || error.message.includes('1254043')) {
          this.logger.warn(`[SyncService] 飞书记录不存在，移除本地映射关系，内容ID: ${content.id}，飞书记录ID: ${content.feishu_record_id}`)
          
          // 删除映射关系，下次同步时会作为新记录重新创建
          await run('DELETE FROM feishu_sync_mapping WHERE content_id = ?', [content.id])
          
          stats.details.push({
            type: 'update_error_record_not_found',
            content_id: content.id,
            feishu_record_id: content.feishu_record_id,
            action: 'mapping_removed'
          })
          
          // 可以在这里尝试立即作为新记录创建，或者等待下一次同步
          // 为了简单起见，我们移除映射，下次同步会自动检测到"新增"
        } else if (error.message.includes('1254063') || (error.response && error.response.data && JSON.stringify(error.response.data).includes('1254063'))) {
          // MultiSelectFieldConvFail: Retry without tags and type (which might be a select field)
          this.logger.warn(`[SyncService] 多选/单选字段转换失败，尝试移除标签和类型后重试。内容ID: ${content.id}`)
          
          // Remove tags and type fields
          const retryFields = { ...record.fields }
          // Find keys that might be tags or type
          const sensitiveKeys = ['标签', 'Tags', 'Keywords', '内容类型', '分类', 'Type', 'Category']
          
          Object.keys(retryFields).forEach(key => {
            if (sensitiveKeys.includes(key)) {
              delete retryFields[key]
            }
          })

          try {
            await this.adapter.updateRecord(
              this.tableId.split('_')[0],
              this.tableId.split('_')[1],
              content.feishu_record_id,
              retryFields
            )
            
            await this.updateMapping(content.id, content.feishu_record_id, content.updated_at, 'to_feishu')
            
            this.logger.info(`[SyncService] 飞书记录更新成功(无标签): ${content.feishu_record_id}`)
            stats.success++
            stats.details.push({
              type: 'update_partial',
              content_id: content.id,
              feishu_record_id: content.feishu_record_id,
              note: 'tags_skipped'
            })
          } catch (retryError) {
            const errorDetails = retryError.response && retryError.response.data ? JSON.stringify(retryError.response.data) : retryError.message
            this.logger.error(`[SyncService] 重试更新飞书记录失败，内容ID: ${content.id}，错误:`, errorDetails)
            stats.failed++
            stats.details.push({
              type: 'update_retry_failed',
              content_id: content.id,
              error: retryError.message
            })
          }
        } else {
          const errorDetails = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message
          this.logger.error(`[SyncService] 更新飞书记录失败，内容ID: ${content.id}，错误:`, errorDetails)
          stats.failed++
          stats.details.push({
            type: 'update_error',
            content_id: content.id,
            error: error.message
          })
        }
      }
    }

    return stats
  }

  /**
   * 删除飞书记录
   */
  async deleteFeishuRecords(deletes) {
    const stats = { success: 0, failed: 0, details: [] }

    const recordIds = deletes.map(d => d.feishu_record_id).filter(Boolean)
    
    if (recordIds.length === 0) {
      return stats
    }

    try {
      await this.adapter.batchDeleteRecords(
        this.tableId.split('_')[0],
        this.tableId.split('_')[1],
        recordIds
      )

      // 删除映射关系
      for (const item of deletes) {
        await run('DELETE FROM feishu_sync_mapping WHERE content_id = ?', [item.id])
        stats.success++
        stats.details.push({
          type: 'delete',
          content_id: item.id,
          feishu_record_id: item.feishu_record_id
        })
      }
    } catch (error) {
      this.logger.error('[SyncService] 批量删除飞书记录失败:', error.message)
      stats.failed += deletes.length
      stats.details.push({
        type: 'batch_delete_error',
        error: error.message
      })
    }

    return stats
  }

  /**
   * 创建本地内容
   * 策略：以飞书的记录(content)和附件(attachments)为准，当标题为空时触发AI分析补充其他字段
   */
  async createLocalContents(records) {
    const stats = { success: 0, failed: 0, details: [] }

    for (const record of records) {
      try {
        // 检查是否已经存在该飞书记录的映射
        const existingMapping = await queryOne(
          'SELECT content_id FROM feishu_sync_mapping WHERE feishu_record_id = ?',
          [record.record_id]
        )

        if (existingMapping) {
          this.logger.info(`[SyncService] 飞书记录 ${record.record_id} 已存在，跳过创建`)
          stats.details.push({
            type: 'skip_duplicate',
            content_id: existingMapping.content_id,
            feishu_record_id: record.record_id
          })
          continue
        }

        const data = this.adapter.convertFromFeishuRecord(record)

        // 添加调试日志
        this.logger.info(`[SyncService] Processing record ${record.record_id}: title="${data.title}", content_length=${data.content?.length || 0}`)

        // 验证数据：跳过完全空的记录（只需要有内容即可）
        if (!data.content || data.content.trim() === '') {
          this.logger.warn(`[SyncService] Skipping empty record from Feishu (no content): ${record.record_id}`)
          stats.details.push({
            type: 'skip_empty',
            feishu_record_id: record.record_id,
            reason: 'No content'
          })
          continue
        }

        // 检查标题是否为空，如果为空则触发AI分析
        let aiEnhanced = false
        if (!data.title || data.title.trim() === '' || data.title === '未命名笔记') {
          try {
            this.logger.info(`[SyncService] Title is empty, analyzing with AI for record ${record.record_id}...`)
            const input = data.content || ''
            const aiResult = await analyzeContent(input, null) // 不传入URL，让AI自己提取

            if (aiResult) {
              // AI解析的字段用于补充
              data.title = aiResult.title || '未命名笔记'
              data.summary = aiResult.summary || data.summary || ''
              data.type = aiResult.type || data.type || 'note'

              // AI提取的URL（从内容中提取）
              if (aiResult.url) {
                data.source = aiResult.url
              }

              // 如果AI抓取了URL内容，使用AI优化的内容
              if (aiResult.content) {
                data.content = aiResult.content
              } else if (aiResult.fetchedContent) {
                data.content = aiResult.fetchedContent
              }

              // 使用AI生成的标签
              if (aiResult.tags && aiResult.tags.length > 0) {
                data.tags = aiResult.tags
              }

              aiEnhanced = true
              this.logger.info(`[SyncService] AI enhanced content: title="${data.title}", type="${data.type}", url="${data.source}", tags=[${data.tags?.join(', ')}]`)
            }
          } catch (error) {
            this.logger.warn(`[SyncService] AI analysis failed for record ${record.record_id}:`, error.message)
          }
        }

        // 如果AI分析失败或未触发，使用默认值
        if (!data.title || data.title.trim() === '') {
          data.title = '未命名笔记'
        }
        if (!data.type) {
          data.type = 'note'
        }

        // 创建内容
        const result = await run(
          `INSERT INTO contents (user_id, type, title, content, source, rating, is_favorite, attachments, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            this.userId,
            data.type,
            data.title,
            data.content,
            data.source,
            data.rating,
            data.is_favorite,
            data.attachments ? JSON.stringify(data.attachments) : null,
            data.created_at || new Date().toISOString(),
            data.updated_at || new Date().toISOString()
          ]
        )

        const contentId = result.lastID

        // 处理标签
        await this.syncTags(contentId, data.tags)

        // 创建映射
        await this.createMapping(contentId, record.record_id, data.updated_at, 'from_feishu')

        // 如果AI增强了数据，回填到飞书
        if (aiEnhanced) {
          try {
            this.logger.info(`[SyncService] Backfilling AI-enhanced fields to Feishu: ${record.record_id}`)
            const tags = (data.tags || []).map(name => ({ name }))
            const recordToUpdate = this.adapter.convertToFeishuRecord(
              { ...data, id: contentId },
              tags
            )

            await this.adapter.updateRecord(
              this.tableId.split('_')[0],
              this.tableId.split('_')[1],
              record.record_id,
              recordToUpdate.fields
            )

            this.logger.info(`[SyncService] Successfully backfilled to Feishu: title="${data.title}", type="${data.type}"`)
          } catch (error) {
            this.logger.warn(`[SyncService] Failed to backfill to Feishu: ${error.message}`)
            // 不影响本地创建的成功状态
          }
        }

        this.logger.info(`[SyncService] 创建本地内容成功，ID: ${contentId}，飞书记录: ${record.record_id}`)
        stats.success++
        stats.details.push({
          type: 'create_local',
          content_id: contentId,
          feishu_record_id: record.record_id,
          ai_enhanced: aiEnhanced
        })

        // 添加详细日志
        syncState.update(this.userId, {
          message: `✓ 已拉取: ${data.title || '未命名'} ${aiEnhanced ? '(AI增强)' : ''} (${stats.success}/${records.length})`
        })
      } catch (error) {
        this.logger.error(`[SyncService] 创建本地内容失败，飞书记录ID: ${record.record_id}，错误:`, error.message)
        stats.failed++
        stats.details.push({
          type: 'create_local_error',
          feishu_record_id: record.record_id,
          error: error.message
        })
      }
    }

    return stats
  }

  /**
   * 更新本地内容
   * 策略：以飞书的记录(content)和附件(attachments)为准，其他字段以本地为准
   */
  async updateLocalContents(records) {
    const stats = { success: 0, failed: 0, details: [] }

    for (const record of records) {
      try {
        const feishuData = this.adapter.convertFromFeishuRecord(record)

        if (!feishuData.id) {
          throw new Error('Missing content ID in Feishu record')
        }

        // 1. 获取本地现有数据
        const localContent = await queryOne(
          'SELECT * FROM contents WHERE id = ? AND user_id = ?',
          [feishuData.id, this.userId]
        )

        if (!localContent) {
          this.logger.warn(`[SyncService] Local content not found for update: ${feishuData.id}`)
          continue
        }

        // 2. 获取本地标签（标签以本地为准）
        const localTags = await query(
          `SELECT t.name FROM tags t
           JOIN content_tags ct ON t.id = ct.tag_id
           WHERE ct.content_id = ?`,
          [feishuData.id]
        )
        const localTagNames = localTags.map(t => t.name)

        // 3. 构造合并数据
        // 以飞书的 content 和 attachments 为准，其他字段以本地为准
        const mergedData = {
          ...localContent, // 基础使用本地数据
          content: feishuData.content, // 内容强制使用飞书
          attachments: feishuData.attachments, // 附件强制使用飞书
          updated_at: feishuData.updated_at, // 更新时间使用飞书的
          tags: localTagNames // 标签使用本地的
        }

        // 4. 检查标题是否为空，如果为空则触发AI分析
        let isAiEnhanced = false
        if (!mergedData.title || mergedData.title.trim() === '' || mergedData.title === '未命名笔记') {
          try {
            this.logger.info(`[SyncService] Title is empty, analyzing with AI for record ${record.record_id}...`)
            const input = mergedData.content || ''
            const aiResult = await analyzeContent(input, null)

            if (aiResult) {
              // AI分析补充字段
              mergedData.title = aiResult.title || '未命名笔记'
              mergedData.summary = aiResult.summary || mergedData.summary || ''
              mergedData.type = aiResult.type || mergedData.type || 'note'

              // AI提取的URL
              if (aiResult.url) {
                mergedData.source = aiResult.url
              }

              // 使用AI优化的内容
              if (aiResult.content) {
                mergedData.content = aiResult.content
              } else if (aiResult.fetchedContent) {
                mergedData.content = aiResult.fetchedContent
              }

              // 使用AI生成的标签（补充到本地标签）
              if (aiResult.tags && aiResult.tags.length > 0) {
                // 合并AI标签和本地标签，去重
                const combinedTags = [...new Set([...localTagNames, ...aiResult.tags])]
                mergedData.tags = combinedTags
              }

              isAiEnhanced = true
              this.logger.info(`[SyncService] AI enhanced content: title="${mergedData.title}", type="${mergedData.type}", url="${mergedData.source}"`)
            }
          } catch (error) {
            this.logger.warn(`[SyncService] AI analysis failed for record ${record.record_id}:`, error.message)
            // AI失败时使用默认值
            if (!mergedData.title || mergedData.title.trim() === '') {
              mergedData.title = '未命名笔记'
            }
          }
        }

        // 5. 更新本地
        await this.updateLocalContent(feishuData.id, mergedData, feishuData.updated_at)

        // 6. 如果AI增强了数据，回填到飞书
        if (isAiEnhanced) {
          try {
            this.logger.info(`[SyncService] Backfilling AI-enhanced fields to Feishu: ${record.record_id}`)
            const tags = mergedData.tags.map(name => ({ name }))
            const recordToUpdate = this.adapter.convertToFeishuRecord(
              { ...mergedData, id: feishuData.id },
              tags
            )

            await this.adapter.updateRecord(
              this.tableId.split('_')[0],
              this.tableId.split('_')[1],
              record.record_id,
              recordToUpdate.fields
            )

            this.logger.info(`[SyncService] Successfully backfilled to Feishu: title="${mergedData.title}", type="${mergedData.type}"`)
          } catch (error) {
            this.logger.warn(`[SyncService] Failed to backfill to Feishu: ${error.message}`)
            // 不影响本地更新的成功状态
          }
        }

        stats.success++
        stats.details.push({
          type: 'update_local',
          content_id: feishuData.id,
          feishu_record_id: record.record_id,
          ai_enhanced: isAiEnhanced
        })

        // 添加详细日志
        syncState.update(this.userId, {
          message: `✓ 已更新: ${mergedData.title || '未命名'} ${isAiEnhanced ? '(AI增强)' : ''} (${stats.success}/${records.length})`
        })
      } catch (error) {
        this.logger.error(`[SyncService] 更新本地内容失败，飞书记录ID: ${record.record_id}，错误:`, error.message)
        stats.failed++
        stats.details.push({
          type: 'update_local_error',
          feishu_record_id: record.record_id,
          error: error.message
        })
      }
    }

    return stats
  }

  /**
   * 更新本地内容（内部方法）
   */
  async updateLocalContent(contentId, data, mappingUpdatedAt = null) {
    await run(
      `UPDATE contents
       SET type = ?, title = ?, content = ?, summary = ?, source = ?, rating = ?, is_favorite = ?, attachments = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.type,
        data.title,
        data.content,
        data.summary || '',
        data.source,
        data.rating,
        data.is_favorite,
        data.attachments ? JSON.stringify(data.attachments) : null,
        data.updated_at || new Date().toISOString(),
        contentId,
        this.userId
      ]
    )

    // 更新标签
    await this.syncTags(contentId, data.tags)

    // 更新映射
    // 优先使用传入的 mappingUpdatedAt (原始飞书时间)，否则使用 data.updated_at
    await this.updateMapping(contentId, data.feishu_record_id, mappingUpdatedAt || data.updated_at, 'from_feishu')
  }

  /**
   * 同步标签
   */
  async syncTags(contentId, tagNames) {
    // 删除现有标签关联
    await run('DELETE FROM content_tags WHERE content_id = ?', [contentId])

    if (!tagNames || tagNames.length === 0) {
      return
    }

    for (const tagName of tagNames) {
      // 查找或创建标签
      let tag = await queryOne(
        'SELECT id FROM tags WHERE name = ? AND user_id = ?',
        [tagName, this.userId]
      )

      if (!tag) {
        const result = await run(
          'INSERT INTO tags (name, user_id) VALUES (?, ?)',
          [tagName, this.userId]
        )
        tag = { id: result.lastID }
      }

      // 创建关联
      await run(
        'INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)',
        [contentId, tag.id]
      )
    }
  }

  /**
   * 获取飞书所有记录
   */
  async fetchAllFeishuRecords() {
    const allRecords = []
    let pageToken = null

    do {
      const response = await this.adapter.searchRecords(
        this.tableId.split('_')[0],
        this.tableId.split('_')[1],
        { pageSize: 100, pageToken }
      )

      allRecords.push(...response.items)
      pageToken = response.has_more ? response.page_token : null
    } while (pageToken)

    return allRecords
  }

  /**
   * 创建同步映射
   */
  async createMapping(contentId, feishuRecordId, updatedAt, direction) {
    await run(
      `INSERT INTO feishu_sync_mapping 
       (content_id, feishu_record_id, local_updated_at, feishu_updated_at, last_sync_at, sync_direction)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        contentId,
        feishuRecordId,
        updatedAt,
        updatedAt,
        new Date().toISOString(),
        direction
      ]
    )
  }

  /**
   * 更新同步映射
   */
  async updateMapping(contentId, feishuRecordId, updatedAt, direction) {
    const field = direction === 'to_feishu' ? 'local_updated_at' : 'feishu_updated_at'
    
    await run(
      `UPDATE feishu_sync_mapping 
       SET ${field} = ?, last_sync_at = ?, sync_direction = ?
       WHERE content_id = ?`,
      [updatedAt, new Date().toISOString(), direction, contentId]
    )
  }

  /**
   * 更新token
   */
  async updateToken(tokenInfo) {
    await run(
      `UPDATE feishu_sync_config 
       SET access_token = ?, token_expires_at = ?, updated_at = ?
       WHERE user_id = ?`,
      [
        tokenInfo.access_token,
        tokenInfo.expires_at.toISOString(),
        new Date().toISOString(),
        this.userId
      ]
    )
  }

  /**
   * 清空本地数据
   */
  async clearLocalData() {
    this.logger.warn(`[SyncService] 正在清空本地数据，用户ID: ${this.userId}`)
    
    // 删除所有关联的标签关系
    await run(`
      DELETE FROM content_tags 
      WHERE content_id IN (SELECT id FROM contents WHERE user_id = ?)
    `, [this.userId])
    
    // 删除所有映射关系
    await run(`
      DELETE FROM feishu_sync_mapping 
      WHERE content_id IN (SELECT id FROM contents WHERE user_id = ?)
    `, [this.userId])
    
    // 删除所有内容
    await run('DELETE FROM contents WHERE user_id = ?', [this.userId])
    
    this.logger.warn(`[SyncService] 本地数据已清空`)
  }

  /**
   * 创建同步日志
   */
  async createSyncLog(syncType) {
    const result = await run(
      `INSERT INTO feishu_sync_log (user_id, sync_type, start_at, status)
       VALUES (?, ?, ?, ?)`,
      [this.userId, syncType, new Date().toISOString(), 'running']
    )
    return result.lastID
  }

  /**
   * 完成同步日志
   */
  async completeSyncLog(syncId, status, stats, errorMessage = null) {
    await run(
      `UPDATE feishu_sync_log 
       SET end_at = ?, status = ?, total_count = ?, success_count = ?, 
           failed_count = ?, conflict_count = ?, error_message = ?, details = ?
       WHERE id = ?`,
      [
        new Date().toISOString(),
        status,
        stats.total,
        stats.success,
        stats.failed,
        stats.conflicts || 0,
        errorMessage,
        JSON.stringify(stats.details),
        syncId
      ]
    )
  }
}

export default SyncService
