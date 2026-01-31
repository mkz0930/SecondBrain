import NetInfo from '@react-native-community/netinfo';
import {getClipboardQueue} from '../database/ClipboardQueue';
import apiService from './ApiService';
import PushNotification from 'react-native-push-notification';
import performanceMonitor from '../utils/PerformanceMonitor';
import logger from '../utils/Logger';

/**
 * 同步服务
 * 负责离线队列的同步管理
 */

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.retryDelays = [1000, 5000, 15000, 60000]; // 指数退避
    this.syncInterval = null;
    this.retryTimers = new Map(); // 存储重试定时器，避免内存泄漏
    this.syncListeners = new Set(); // 同步状态监听器
    this.syncStats = {
      totalSynced: 0,
      totalFailed: 0,
      lastSyncTime: null,
      currentlySyncing: 0,
    };
  }

  /**
   * 启动自动同步
   */
  startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    console.log('[SyncService] Starting auto sync, interval:', intervalMinutes, 'minutes');

    // 立即执行一次
    this.syncPendingItems();

    // 定期同步
    this.syncInterval = setInterval(() => {
      this.syncPendingItems();
    }, intervalMinutes * 60 * 1000);

    // 监听网络状态变化
    this.setupNetworkListener();
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncService] Auto sync stopped');
    }

    // 清理所有重试定时器
    this.clearAllRetryTimers();
  }

  /**
   * 清理所有重试定时器
   */
  clearAllRetryTimers() {
    for (const [itemId, timer] of this.retryTimers.entries()) {
      clearTimeout(timer);
      this.retryTimers.delete(itemId);
    }
    console.log('[SyncService] All retry timers cleared');
  }

  /**
   * 监听网络状态变化
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      console.log('[SyncService] Network state changed:', state.isConnected);

      // 网络恢复时自动同步
      if (state.isConnected && !this.isSyncing) {
        console.log('[SyncService] Network restored, triggering sync');
        this.syncPendingItems();
      }
    });
  }

  /**
   * 同步待处理的项目
   */
  async syncPendingItems() {
    if (this.isSyncing) {
      logger.warn('SyncService', 'Sync already in progress');
      return {success: false, message: '同步正在进行中'};
    }

    // 检查网络连接
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      logger.warn('SyncService', 'No network connection, skipping sync');
      return {success: false, message: '无网络连接'};
    }

    this.isSyncing = true;
    this.notifyListeners('started');
    performanceMonitor.startTiming('syncPendingItems');

    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      const queue = await getClipboardQueue();
      const pendingItems = await queue.getPendingItems(10);

      if (pendingItems.length === 0) {
        logger.info('SyncService', 'No pending items to sync');
        return {success: true, message: '没有待同步项目'};
      }

      logger.info('SyncService', 'Syncing pending items', {
        count: pendingItems.length,
      });
      this.syncStats.currentlySyncing = pendingItems.length;

      // 批量同步优化：并发处理多个项目（最多3个）
      const batchSize = 3;
      for (let i = 0; i < pendingItems.length; i += batchSize) {
        const batch = pendingItems.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(item => this.syncItem(item, queue)),
        );

        // 统计结果
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            results.synced++;
            this.syncStats.totalSynced++;
          } else {
            results.failed++;
            this.syncStats.totalFailed++;
            results.errors.push({
              item: batch[index].id,
              error: result.reason || result.value?.error,
            });
          }
        });
      }

      this.syncStats.lastSyncTime = Date.now();
      const duration = performanceMonitor.endTiming('syncPendingItems');
      logger.info('SyncService', 'Sync completed', {
        ...results,
        duration: `${duration}ms`,
      });
    } catch (error) {
      logger.error('SyncService', 'Sync error', error);
      performanceMonitor.recordError(error, {operation: 'syncPendingItems'});
      results.success = false;
      results.errors.push({error: error.message});
    } finally {
      this.isSyncing = false;
      this.syncStats.currentlySyncing = 0;
      this.notifyListeners('completed', results);
    }

    return results;
  }

  /**
   * 同步单个项目
   */
  async syncItem(item, queue) {
    performanceMonitor.recordSyncAttempt();
    performanceMonitor.startTiming(`syncItem_${item.id}`);

    try {
      logger.info('SyncService', 'Syncing item', {itemId: item.id});

      // 更新状态为处理中
      await queue.updateItemStatus(item.id, 'processing');

      // 调用快速保存 API
      const result = await apiService.quickSave(item.url);

      // 标记为已同步
      await queue.updateItemStatus(item.id, 'synced', {
        server_id: result.id,
        synced_at: Date.now(),
        analyzed_title: result.title,
        analyzed_summary: result.summary,
        analyzed_type: result.type,
        analyzed_tags: JSON.stringify(result.tags || []),
      });

      const duration = performanceMonitor.endTiming(`syncItem_${item.id}`);
      logger.info('SyncService', 'Item synced successfully', {
        itemId: item.id,
        duration: `${duration}ms`,
      });

      // 记录同步成功
      performanceMonitor.recordSyncSuccess();

      // 清除该项目的重试定时器
      this.clearRetryTimer(item.id);

      // 显示成功通知
      this.showSuccessNotification(result.title || item.url);

      return {success: true, itemId: item.id};
    } catch (error) {
      performanceMonitor.endTiming(`syncItem_${item.id}`);
      logger.error('SyncService', 'Error syncing item', error);
      performanceMonitor.recordSyncFailure();
      performanceMonitor.recordError(error, {
        operation: 'syncItem',
        itemId: item.id,
        url: item.url,
      });

      // 增加重试计数
      const newRetryCount = (item.retry_count || 0) + 1;

      if (newRetryCount < this.retryDelays.length) {
        // 稍后重试
        await queue.updateItemStatus(item.id, 'pending', {
          retry_count: newRetryCount,
          last_error: error.message,
        });

        logger.info('SyncService', 'Will retry item', {
          itemId: item.id,
          retryCount: newRetryCount,
          delay: `${this.retryDelays[newRetryCount]}ms`,
        });

        // 使用改进的重试机制：存储定时器引用
        this.scheduleRetry(item.id, newRetryCount, async () => {
          const queue = await getClipboardQueue();
          const updatedItem = await queue.getPendingItems(1);
          if (updatedItem.length > 0 && updatedItem[0].id === item.id) {
            await this.syncItem(updatedItem[0], queue);
          }
        });

        return {success: false, itemId: item.id, willRetry: true};
      } else {
        // 标记为失败
        await queue.updateItemStatus(item.id, 'failed', {
          retry_count: newRetryCount,
          last_error: error.message,
        });

        logger.error('SyncService', 'Item failed after retries', {
          itemId: item.id,
          retryCount: newRetryCount,
          error: error.message,
        });

        // 清除重试定时器
        this.clearRetryTimer(item.id);

        // 显示失败通知
        this.showFailureNotification(item.url, error.message);

        return {success: false, itemId: item.id, error: error.message};
      }
    }
  }

  /**
   * 安排重试
   */
  scheduleRetry(itemId, retryCount, callback) {
    // 清除旧的定时器
    this.clearRetryTimer(itemId);

    // 创建新的定时器
    const timer = setTimeout(() => {
      this.retryTimers.delete(itemId);
      callback();
    }, this.retryDelays[retryCount]);

    this.retryTimers.set(itemId, timer);
  }

  /**
   * 清除重试定时器
   */
  clearRetryTimer(itemId) {
    const timer = this.retryTimers.get(itemId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(itemId);
      console.log('[SyncService] Retry timer cleared for:', itemId);
    }
  }

  /**
   * 显示成功通知
   */
  showSuccessNotification(title) {
    PushNotification.localNotification({
      channelId: 'sync-channel',
      title: '保存成功',
      message: title,
      playSound: false,
      vibrate: false,
    });
  }

  /**
   * 显示失败通知
   */
  showFailureNotification(url, error) {
    const displayUrl = url.length > 30 ? url.substring(0, 30) + '...' : url;

    PushNotification.localNotification({
      channelId: 'sync-channel',
      title: '保存失败',
      message: `${displayUrl}\n${error}`,
      playSound: false,
      vibrate: false,
    });
  }

  /**
   * 手动触发同步
   */
  async manualSync() {
    console.log('[SyncService] Manual sync triggered');
    await this.syncPendingItems();
  }

  /**
   * 获取同步统计
   */
  async getSyncStats() {
    const queue = await getClipboardQueue();
    const queueStats = await queue.getStats();

    return {
      ...queueStats,
      totalSynced: this.syncStats.totalSynced,
      totalFailed: this.syncStats.totalFailed,
      lastSyncTime: this.syncStats.lastSyncTime,
      currentlySyncing: this.syncStats.currentlySyncing,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * 添加同步状态监听器
   */
  addSyncListener(listener) {
    this.syncListeners.add(listener);
    console.log('[SyncService] Sync listener added');
  }

  /**
   * 移除同步状态监听器
   */
  removeSyncListener(listener) {
    this.syncListeners.delete(listener);
    console.log('[SyncService] Sync listener removed');
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(event, data) {
    for (const listener of this.syncListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[SyncService] Error notifying listener:', error);
      }
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.syncStats = {
      totalSynced: 0,
      totalFailed: 0,
      lastSyncTime: null,
      currentlySyncing: 0,
    };
    console.log('[SyncService] Stats reset');
  }
}

// 单例模式
const syncService = new SyncService();

export default syncService;
