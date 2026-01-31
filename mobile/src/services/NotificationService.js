import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {getClipboardQueue} from '../database/ClipboardQueue';
import syncService from './SyncService';

/**
 * 通知配置
 * 初始化推送通知服务
 */

class NotificationService {
  constructor() {
    this.configured = false;
    this.notificationHandlers = new Map(); // 存储通知处理器
  }

  /**
   * 配置通知服务
   */
  configure() {
    if (this.configured) {
      return;
    }

    const self = this;

    PushNotification.configure({
      // 当通知被点击时调用
      onNotification: async function (notification) {
        console.log('[Notification] Notification clicked:', notification);

        // 处理通知点击
        if (notification.userInfo) {
          const {url, itemId, action} = notification.userInfo;

          if (action === 'save') {
            // 用户点击了"保存"按钮
            console.log('[Notification] User clicked save for:', url);
            await self.handleSaveAction(itemId, url);
          } else if (action === 'ignore') {
            // 用户点击了"忽略"按钮
            console.log('[Notification] User clicked ignore for:', url);
            await self.handleIgnoreAction(itemId, url);
          }
        }

        // iOS 需要调用这个方法
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },

      // 当通知动作被点击时调用
      onAction: async function (notification) {
        console.log('[Notification] Action clicked:', notification.action);

        if (notification.userInfo) {
          const {url, itemId} = notification.userInfo;
          const action = notification.action;

          if (action === '保存') {
            await self.handleSaveAction(itemId, url);
          } else if (action === '忽略') {
            await self.handleIgnoreAction(itemId, url);
          }
        }
      },

      // 请求权限
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // 是否在前台显示通知
      popInitialNotification: true,

      // 请求权限（iOS）
      requestPermissions: true,
    });

    // 创建通知频道（Android 8.0+）
    PushNotification.createChannel(
      {
        channelId: 'clipboard-channel',
        channelName: '剪切板监听',
        channelDescription: '剪切板检测到新链接时的通知',
        playSound: false,
        soundName: 'default',
        importance: 4,
        vibrate: false,
      },
      created => console.log(`[Notification] Channel created: ${created}`),
    );

    PushNotification.createChannel(
      {
        channelId: 'sync-channel',
        channelName: '同步通知',
        channelDescription: '内容同步成功或失败的通知',
        playSound: false,
        soundName: 'default',
        importance: 3,
        vibrate: false,
      },
      created => console.log(`[Notification] Channel created: ${created}`),
    );

    this.configured = true;
    console.log('[Notification] Service configured');
  }

  /**
   * 显示本地通知
   */
  showNotification(options) {
    PushNotification.localNotification({
      channelId: options.channelId || 'clipboard-channel',
      title: options.title,
      message: options.message,
      userInfo: options.userInfo || {},
      playSound: options.playSound !== undefined ? options.playSound : false,
      vibrate: options.vibrate !== undefined ? options.vibrate : false,
      actions: options.actions || [],
      invokeApp: options.invokeApp !== undefined ? options.invokeApp : false,
    });
  }

  /**
   * 取消所有通知
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
    console.log('[Notification] All notifications cancelled');
  }

  /**
   * 获取已发送的通知
   */
  getDeliveredNotifications(callback) {
    PushNotification.getDeliveredNotifications(callback);
  }

  /**
   * 处理保存动作
   */
  async handleSaveAction(itemId, url) {
    try {
      console.log('[Notification] Handling save action for:', itemId);

      // 触发立即同步
      await syncService.syncPendingItems();

      // 显示成功提示
      this.showNotification({
        channelId: 'sync-channel',
        title: '正在保存',
        message: '内容正在同步到外挂大脑...',
        playSound: false,
        vibrate: false,
      });

      // 调用自定义处理器（如果有）
      const handler = this.notificationHandlers.get('save');
      if (handler) {
        await handler(itemId, url);
      }
    } catch (error) {
      console.error('[Notification] Error handling save action:', error);
      this.showNotification({
        channelId: 'sync-channel',
        title: '保存失败',
        message: error.message || '保存时发生错误',
        playSound: false,
        vibrate: false,
      });
    }
  }

  /**
   * 处理忽略动作
   */
  async handleIgnoreAction(itemId, url) {
    try {
      console.log('[Notification] Handling ignore action for:', itemId);

      // 从队列中删除
      const queue = await getClipboardQueue();
      await queue.deleteItem(itemId);

      console.log('[Notification] Item ignored and deleted:', itemId);

      // 调用自定义处理器（如果有）
      const handler = this.notificationHandlers.get('ignore');
      if (handler) {
        await handler(itemId, url);
      }
    } catch (error) {
      console.error('[Notification] Error handling ignore action:', error);
    }
  }

  /**
   * 注册通知动作处理器
   */
  registerHandler(action, handler) {
    this.notificationHandlers.set(action, handler);
    console.log('[Notification] Handler registered for action:', action);
  }

  /**
   * 取消注册通知动作处理器
   */
  unregisterHandler(action) {
    this.notificationHandlers.delete(action);
    console.log('[Notification] Handler unregistered for action:', action);
  }
}

// 单例模式
const notificationService = new NotificationService();

export default notificationService;
