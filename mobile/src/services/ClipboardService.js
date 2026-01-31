import Clipboard from '@react-native-clipboard/clipboard';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import {getClipboardQueue} from '../database/ClipboardQueue';
import {isValidURL, shouldProcessURL} from '../utils/urlValidator';
import {shouldProcessUrlWithCustomRules} from '../screens/UrlFilterScreen';
import performanceMonitor from '../utils/PerformanceMonitor';
import logger from '../utils/Logger';

/**
 * 剪切板监听服务
 * 后台持续监听剪切板变化，检测到 URL 时弹出通知
 */
class ClipboardMonitor {
  constructor() {
    this.lastContent = '';
    this.checkInterval = 2000; // 2秒检查一次
    this.isRunning = false;
    this.processedUrls = new Set(); // 已处理的URL集合（去重）
    this.maxProcessedUrls = 100; // 最多保存100个已处理URL
    this.idleCheckInterval = 5000; // 空闲时5秒检查一次
    this.activeCheckInterval = 2000; // 活跃时2秒检查一次
    this.lastChangeTime = Date.now(); // 上次剪贴板变化时间
    this.idleThreshold = 60000; // 60秒无变化视为空闲
  }

  /**
   * 启动监听服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('ClipboardMonitor', 'Service already running');
      return;
    }

    logger.info('ClipboardMonitor', 'Starting clipboard monitoring service');

    const options = {
      taskName: 'ClipboardMonitor',
      taskTitle: '外挂大脑剪切板监听',
      taskDesc: '正在监听剪切板中的链接',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff00ff',
      linkingURI: 'secondbrain://clipboard',
      parameters: {
        delay: this.checkInterval,
      },
    };

    await BackgroundService.start(this.monitorTask.bind(this), options);
    this.isRunning = true;
  }

  /**
   * 停止监听服务
   */
  async stop() {
    console.log('[ClipboardMonitor] Stopping clipboard monitoring service');
    await BackgroundService.stop();
    this.isRunning = false;
  }

  /**
   * 后台监听任务
   */
  async monitorTask(taskData) {
    await new Promise(async resolve => {
      while (BackgroundService.isRunning()) {
        try {
          // 记录剪贴板检查
          performanceMonitor.recordClipboardCheck();

          // 读取剪切板内容
          const content = await Clipboard.getString();

          // 检查是否为新内容且为 URL
          if (content && content !== this.lastContent) {
            logger.debug('ClipboardMonitor', 'Clipboard changed', {
              preview: content.substring(0, 50),
            });
            this.lastChangeTime = Date.now();

            if (isValidURL(content)) {
              // 先检查自定义规则
              const customRuleResult = await shouldProcessUrlWithCustomRules(content);

              // 如果自定义规则返回明确结果，使用它；否则使用默认规则
              const shouldProcess = customRuleResult !== null
                ? customRuleResult
                : shouldProcessURL(content);

              if (shouldProcess) {
                // 记录URL检测
                performanceMonitor.recordUrlDetected();

                // 检查是否已处理过（去重）
                if (!this.processedUrls.has(content)) {
                  logger.info('ClipboardMonitor', 'Valid URL detected', {url: content});
                  this.lastContent = content;
                  await this.handleNewURL(content);

                  // 添加到已处理集合
                  this.addProcessedUrl(content);

                  // 记录URL处理
                  performanceMonitor.recordUrlProcessed();
                } else {
                  logger.debug('ClipboardMonitor', 'URL already processed, skipping', {
                    preview: content.substring(0, 50),
                  });
                }
              }
            }
          }
        } catch (error) {
          logger.error('ClipboardMonitor', 'Error in monitor task', error);
          performanceMonitor.recordError(error, {operation: 'monitorTask'});
        }

        // 智能间隔：根据活跃度调整检查频率
        const currentInterval = this.getAdaptiveInterval();
        await this.sleep(currentInterval);
      }
    });
  }

  /**
   * 添加已处理的URL到集合
   */
  addProcessedUrl(url) {
    this.processedUrls.add(url);

    // 限制集合大小，防止内存泄漏
    if (this.processedUrls.size > this.maxProcessedUrls) {
      const firstUrl = this.processedUrls.values().next().value;
      this.processedUrls.delete(firstUrl);
    }
  }

  /**
   * 获取自适应检查间隔
   * 根据剪贴板活跃度动态调整
   */
  getAdaptiveInterval() {
    const timeSinceLastChange = Date.now() - this.lastChangeTime;

    // 如果长时间无变化，降低检查频率以节省电量
    if (timeSinceLastChange > this.idleThreshold) {
      return this.idleCheckInterval;
    }

    return this.activeCheckInterval;
  }

  /**
   * 清除已处理URL历史
   */
  clearProcessedUrls() {
    this.processedUrls.clear();
    console.log('[ClipboardMonitor] Processed URLs cleared');
  }

  /**
   * 处理检测到的新 URL
   */
  async handleNewURL(url) {
    try {
      performanceMonitor.startTiming('handleNewURL');

      // 保存到本地队列
      const queue = await getClipboardQueue();
      const itemId = await queue.addItem(url);

      const duration = performanceMonitor.endTiming('handleNewURL');
      logger.info('ClipboardMonitor', 'URL added to queue', {
        itemId,
        duration: `${duration}ms`,
      });

      // 显示通知询问用户
      this.showNotification(url, itemId);
    } catch (error) {
      logger.error('ClipboardMonitor', 'Error handling new URL', error);
      performanceMonitor.recordError(error, {operation: 'handleNewURL', url});
    }
  }

  /**
   * 显示通知
   */
  showNotification(url, itemId) {
    // 截取 URL 显示
    const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;

    PushNotification.localNotification({
      channelId: 'clipboard-channel',
      title: '发现新链接',
      message: displayUrl,
      userInfo: {url, itemId},
      actions: ['保存', '忽略'],
      invokeApp: false,
      playSound: false,
      vibrate: false,
    });
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新检查间隔
   */
  setCheckInterval(interval) {
    this.activeCheckInterval = interval;
    this.checkInterval = interval;
  }

  /**
   * 获取监听统计信息
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processedCount: this.processedUrls.size,
      lastChangeTime: this.lastChangeTime,
      currentInterval: this.getAdaptiveInterval(),
    };
  }
}

// 单例模式
const clipboardMonitor = new ClipboardMonitor();

export default clipboardMonitor;
