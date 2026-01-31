/**
 * 日志记录工具
 * 提供统一的日志记录接口
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 200; // 最多保存200条日志
    this.logLevel = __DEV__ ? 'debug' : 'info'; // 开发环境显示debug，生产环境只显示info及以上
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.logLevel = level;
      console.log('[Logger] Log level set to:', level);
    }
  }

  /**
   * 记录日志
   */
  log(level, tag, message, data = null) {
    // 检查日志级别
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      tag,
      message,
      data,
    };

    // 添加到日志数组
    this.logs.push(logEntry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    const formattedMessage = `[${tag}] ${message}`;
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.log(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
  }

  /**
   * Debug级别日志
   */
  debug(tag, message, data) {
    this.log('debug', tag, message, data);
  }

  /**
   * Info级别日志
   */
  info(tag, message, data) {
    this.log('info', tag, message, data);
  }

  /**
   * Warning级别日志
   */
  warn(tag, message, data) {
    this.log('warn', tag, message, data);
  }

  /**
   * Error级别日志
   */
  error(tag, message, error) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      ...error,
    } : null;
    this.log('error', tag, message, errorData);
  }

  /**
   * 获取所有日志
   */
  getLogs(level = null, limit = 50) {
    let filteredLogs = this.logs;

    // 按级别过滤
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    // 返回最近的N条
    return filteredLogs.slice(-limit);
  }

  /**
   * 获取错误日志
   */
  getErrors(limit = 20) {
    return this.getLogs('error', limit);
  }

  /**
   * 清除日志
   */
  clearLogs() {
    this.logs = [];
    console.log('[Logger] Logs cleared');
  }

  /**
   * 导出日志为文本
   */
  exportLogs() {
    const lines = this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN');
      const dataStr = log.data ? JSON.stringify(log.data) : '';
      return `[${time}] [${log.level.toUpperCase()}] [${log.tag}] ${log.message} ${dataStr}`;
    });

    return lines.join('\n');
  }

  /**
   * 生成日志统计
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }

  /**
   * 打印日志统计
   */
  printStats() {
    const stats = this.getStats();
    console.log('=== 日志统计 ===');
    console.log('总计:', stats.total);
    console.log('Debug:', stats.debug);
    console.log('Info:', stats.info);
    console.log('Warning:', stats.warn);
    console.log('Error:', stats.error);
    console.log('===============');
  }
}

// 单例模式
const logger = new Logger();

export default logger;
