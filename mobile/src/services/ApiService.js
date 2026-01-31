import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API 服务
 * 负责与后端服务器通信
 */

// 配置 API 基础 URL
// 开发环境：使用本地服务器
// 生产环境：使用实际服务器地址
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000' // Android 模拟器访问本机
  : 'https://your-server.com'; // 生产环境地址

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  /**
   * 初始化 - 从存储中加载 token
   */
  async init() {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
      console.log('[ApiService] Token loaded:', this.token ? 'Yes' : 'No');
    } catch (error) {
      console.error('[ApiService] Error loading token:', error);
    }
  }

  /**
   * 设置认证 token
   */
  async setToken(token) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
    console.log('[ApiService] Token saved');
  }

  /**
   * 清除认证 token
   */
  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    console.log('[ApiService] Token cleared');
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-session-token'] = this.token;
    }

    return headers;
  }

  /**
   * 登录
   */
  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        username,
        password,
      });

      if (response.data.token) {
        await this.setToken(response.data.token);
      }

      return response.data;
    } catch (error) {
      console.error('[ApiService] Login error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 登出
   */
  async logout() {
    try {
      await axios.post(
        `${this.baseURL}/api/auth/logout`,
        {},
        {headers: this.getHeaders()},
      );
    } catch (error) {
      console.error('[ApiService] Logout error:', error);
    } finally {
      await this.clearToken();
    }
  }

  /**
   * 获取并解析 URL 内容
   */
  async fetchUrl(url) {
    try {
      console.log('[ApiService] Fetching URL:', url);

      const response = await axios.post(
        `${this.baseURL}/api/contents/fetch-url`,
        {url},
        {
          headers: this.getHeaders(),
          timeout: 15000,
        },
      );

      console.log('[ApiService] URL fetched successfully');
      return response.data;
    } catch (error) {
      console.error('[ApiService] Fetch URL error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 快速保存（获取 + 分析 + 保存）
   */
  async quickSave(url) {
    performanceMonitor.recordApiCall();
    performanceMonitor.startTiming('quickSave');

    try {
      logger.info('ApiService', 'Quick saving URL', {url});

      const response = await axios.post(
        `${this.baseURL}/api/contents/quick-save`,
        {url},
        {
          headers: this.getHeaders(),
          timeout: 30000, // 30秒超时（AI 分析可能较慢）
        },
      );

      const duration = performanceMonitor.endTiming('quickSave');
      logger.info('ApiService', 'Quick save successful', {
        id: response.data.id,
        duration: `${duration}ms`,
      });
      return response.data;
    } catch (error) {
      performanceMonitor.endTiming('quickSave');
      performanceMonitor.recordApiError();
      logger.error('ApiService', 'Quick save error', error);
      performanceMonitor.recordError(error, {operation: 'quickSave', url});
      throw this.handleError(error);
    }
  }

  /**
   * 批量保存
   */
  async batchSave(items) {
    try {
      console.log('[ApiService] Batch saving:', items.length, 'items');

      const response = await axios.post(
        `${this.baseURL}/api/contents/batch`,
        {items},
        {
          headers: this.getHeaders(),
          timeout: 60000, // 60秒超时
        },
      );

      console.log('[ApiService] Batch save completed');
      return response.data;
    } catch (error) {
      console.error('[ApiService] Batch save error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取内容列表
   */
  async getContents(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/api/contents`, {
        params,
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('[ApiService] Get contents error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取单个内容详情
   */
  async getContentById(id) {
    try {
      const response = await axios.get(`${this.baseURL}/api/contents/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('[ApiService] Get content by id error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 更新内容
   */
  async updateContent(id, data) {
    try {
      const response = await axios.put(
        `${this.baseURL}/api/contents/${id}`,
        data,
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Update content error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 删除内容
   */
  async deleteContent(id) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/api/contents/${id}`,
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Delete content error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(id) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/contents/${id}/favorite`,
        {},
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Toggle favorite error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取标签列表
   */
  async getTags() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('[ApiService] Get tags error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 创建标签
   */
  async createTag(data) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/tags`,
        data,
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Create tag error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 更新标签
   */
  async updateTag(id, data) {
    try {
      const response = await axios.put(
        `${this.baseURL}/api/tags/${id}`,
        data,
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Update tag error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(id) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/api/tags/${id}`,
        {headers: this.getHeaders()},
      );
      return response.data;
    } catch (error) {
      console.error('[ApiService] Delete tag error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    try {
      const response = await axios.get(`${this.baseURL}/api/stats`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('[ApiService] Get stats error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取飞书配置
   */
  async getFeishuConfig() {
    try {
      const response = await axios.get(`${this.baseURL}/api/feishu/config`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('[ApiService] Get Feishu config error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 保存飞书配置
   */
  async saveFeishuConfig(config) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/feishu/config`,
        config,
        {
          headers: this.getHeaders(),
        },
      );

      return response.data;
    } catch (error) {
      console.error('[ApiService] Save Feishu config error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 触发飞书同步
   */
  async triggerFeishuSync(direction = 'both') {
    try {
      console.log('[ApiService] Triggering Feishu sync:', direction);

      const response = await axios.post(
        `${this.baseURL}/api/feishu/sync`,
        {direction},
        {
          headers: this.getHeaders(),
          timeout: 120000, // 2分钟超时
        },
      );

      console.log('[ApiService] Feishu sync completed');
      return response.data;
    } catch (error) {
      console.error('[ApiService] Feishu sync error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取飞书同步状态
   */
  async getFeishuSyncStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/api/feishu/status`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('[ApiService] Get sync status error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 错误处理
   */
  handleError(error) {
    if (error.response) {
      // 服务器返回错误
      const message = error.response.data?.error || error.response.data?.message || '请求失败';
      return new Error(message);
    } else if (error.request) {
      // 网络错误
      return new Error('网络连接失败，请检查网络设置');
    } else {
      // 其他错误
      return new Error(error.message || '未知错误');
    }
  }

  /**
   * 检查网络连接
   */
  async checkConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// 单例模式
const apiService = new ApiService();

export default apiService;
