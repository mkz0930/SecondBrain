/**
 * 性能监控工具
 * 用于监控应用性能指标
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      clipboardChecks: 0,
      urlsDetected: 0,
      urlsProcessed: 0,
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0,
      apiCalls: 0,
      apiErrors: 0,
      startTime: Date.now(),
    };

    this.timings = new Map(); // 存储操作耗时
    this.errors = []; // 存储错误记录
    this.maxErrors = 50; // 最多保存50条错误
  }

  /**
   * 记录剪贴板检查
   */
  recordClipboardCheck() {
    this.metrics.clipboardChecks++;
  }

  /**
   * 记录URL检测
   */
  recordUrlDetected() {
    this.metrics.urlsDetected++;
  }

  /**
   * 记录URL处理
   */
  recordUrlProcessed() {
    this.metrics.urlsProcessed++;
  }

  /**
   * 记录同步尝试
   */
  recordSyncAttempt() {
    this.metrics.syncAttempts++;
  }

  /**
   * 记录同步成功
   */
  recordSyncSuccess() {
    this.metrics.syncSuccesses++;
  }

  /**
   * 记录同步失败
   */
  recordSyncFailure() {
    this.metrics.syncFailures++;
  }

  /**
   * 记录API调用
   */
  recordApiCall() {
    this.metrics.apiCalls++;
  }

  /**
   * 记录API错误
   */
  recordApiError() {
    this.metrics.apiErrors++;
  }

  /**
   * 开始计时
   */
  startTiming(operation) {
    this.timings.set(operation, Date.now());
  }

  /**
   * 结束计时并返回耗时
   */
  endTiming(operation) {
    const startTime = this.timings.get(operation);
    if (!startTime) {
      console.warn('[PerformanceMonitor] No start time for operation:', operation);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timings.delete(operation);
    return duration;
  }

  /**
   * 记录错误
   */
  recordError(error, context = {}) {
    const errorRecord = {
      timestamp: Date.now(),
      message: error.message || String(error),
      stack: error.stack,
      context,
    };

    this.errors.push(errorRecord);

    // 限制错误记录数量
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    console.error('[PerformanceMonitor] Error recorded:', errorRecord);
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeHours = uptime / 3600000;

    return {
      ...this.metrics,
      uptime,
      uptimeHours: uptimeHours.toFixed(2),
      checksPerHour: uptimeHours > 0 ? Math.round(this.metrics.clipboardChecks / uptimeHours) : 0,
      syncSuccessRate: this.metrics.syncAttempts > 0
        ? ((this.metrics.syncSuccesses / this.metrics.syncAttempts) * 100).toFixed(1)
        : 0,
      apiErrorRate: this.metrics.apiCalls > 0
        ? ((this.metrics.apiErrors / this.metrics.apiCalls) * 100).toFixed(1)
        : 0,
    };
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }

  /**
   * 清除错误记录
   */
  clearErrors() {
    this.errors = [];
    console.log('[PerformanceMonitor] Errors cleared');
  }

  /**
   * 重置所有指标
   */
  reset() {
    this.metrics = {
      clipboardChecks: 0,
      urlsDetected: 0,
      urlsProcessed: 0,
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0,
      apiCalls: 0,
      apiErrors: 0,
      startTime: Date.now(),
    };
    this.timings.clear();
    this.errors = [];
    console.log('[PerformanceMonitor] Metrics reset');
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    const metrics = this.getMetrics();
    const recentErrors = this.getRecentErrors(5);

    return {
      summary: {
        uptime: `${metrics.uptimeHours} 小时`,
        clipboardChecks: metrics.clipboardChecks,
        urlsDetected: metrics.urlsDetected,
        urlsProcessed: metrics.urlsProcessed,
        checksPerHour: metrics.checksPerHour,
      },
      sync: {
        attempts: metrics.syncAttempts,
        successes: metrics.syncSuccesses,
        failures: metrics.syncFailures,
        successRate: `${metrics.syncSuccessRate}%`,
      },
      api: {
        calls: metrics.apiCalls,
        errors: metrics.apiErrors,
        errorRate: `${metrics.apiErrorRate}%`,
      },
      recentErrors: recentErrors.map(err => ({
        time: new Date(err.timestamp).toLocaleString('zh-CN'),
        message: err.message,
        context: err.context,
      })),
    };
  }

  /**
   * 打印性能报告
   */
  printReport() {
    const report = this.generateReport();
    console.log('=== 性能监控报告 ===');
    console.log('运行时间:', report.summary.uptime);
    console.log('剪贴板检查:', report.summary.clipboardChecks, '次');
    console.log('检测到URL:', report.summary.urlsDetected, '个');
    console.log('处理URL:', report.summary.urlsProcessed, '个');
    console.log('检查频率:', report.summary.checksPerHour, '次/小时');
    console.log('同步成功率:', report.sync.successRate);
    console.log('API错误率:', report.api.errorRate);
    console.log('最近错误:', report.recentErrors.length, '条');
    console.log('==================');
  }
}

// 单例模式
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
