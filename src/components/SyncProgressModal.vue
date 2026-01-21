<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-container">
      <div class="modal-header">
        <h2>飞书同步进度</h2>
        <button class="close-btn" @click="handleClose" :disabled="isRunning">×</button>
      </div>

      <div class="modal-body">
        <!-- 总体进度 -->
        <div class="progress-section">
          <div class="progress-info">
            <span class="progress-label">{{ status.message || '准备同步...' }}</span>
            <span class="progress-percent">{{ status.progress || 0 }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: (status.progress || 0) + '%' }"
              :class="{ 'progress-error': status.status === 'failed' }">
            </div>
          </div>
        </div>

        <!-- 同步阶段指示 -->
        <div class="stage-indicator" v-if="status.stage">
          <div class="stage-item" :class="{ active: status.stage === 'init' }">
            <div class="stage-dot"></div>
            <span>初始化</span>
          </div>
          <div class="stage-item" :class="{ active: status.stage === 'pushing' }">
            <div class="stage-dot"></div>
            <span>推送到飞书</span>
          </div>
          <div class="stage-item" :class="{ active: status.stage === 'pulling' }">
            <div class="stage-dot"></div>
            <span>拉取到本地</span>
          </div>
          <div class="stage-item" :class="{ active: status.stage === 'finished' }">
            <div class="stage-dot"></div>
            <span>完成</span>
          </div>
        </div>

        <!-- 详细日志 -->
        <div class="log-section">
          <div class="log-header">
            <span>同步日志</span>
            <button class="clear-log-btn" @click="clearLogs" v-if="logs.length > 0">清空</button>
          </div>
          <div class="log-container" ref="logContainer">
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="log-item"
              :class="log.type">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">
              等待同步开始...
            </div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-section" v-if="stats.total > 0">
          <div class="stat-item">
            <span class="stat-label">总计</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item success">
            <span class="stat-label">成功</span>
            <span class="stat-value">{{ stats.success }}</span>
          </div>
          <div class="stat-item failed" v-if="stats.failed > 0">
            <span class="stat-label">失败</span>
            <span class="stat-value">{{ stats.failed }}</span>
          </div>
          <div class="stat-item conflict" v-if="stats.conflicts > 0">
            <span class="stat-label">冲突</span>
            <span class="stat-value">{{ stats.conflicts }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn-close"
          @click="handleClose"
          :disabled="isRunning">
          {{ isRunning ? '同步中...' : '关闭' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  status: {
    type: Object,
    default: () => ({
      status: 'idle',
      stage: '',
      message: '',
      progress: 0,
      total: 0
    })
  }
})

const emit = defineEmits(['close'])

const logs = ref([])
const stats = ref({
  total: 0,
  success: 0,
  failed: 0,
  conflicts: 0
})
const logContainer = ref(null)

const isRunning = computed(() => {
  return props.status.status === 'running'
})

// 监听状态变化，添加日志
watch(() => props.status, (newStatus, oldStatus) => {
  if (!newStatus) return

  // 状态变化时添加日志
  if (newStatus.message && newStatus.message !== oldStatus?.message) {
    addLog(newStatus.message, getLogType(newStatus))
  }

  // 更新统计信息
  if (newStatus.total !== undefined) {
    stats.value.total = newStatus.total
  }
  if (newStatus.success !== undefined) {
    stats.value.success = newStatus.success
  }
  if (newStatus.failed !== undefined) {
    stats.value.failed = newStatus.failed
  }
  if (newStatus.conflicts !== undefined) {
    stats.value.conflicts = newStatus.conflicts
  }
}, { deep: true })

// 监听弹窗打开，重置日志
watch(() => props.visible, (visible) => {
  if (visible) {
    logs.value = []
    stats.value = {
      total: 0,
      success: 0,
      failed: 0,
      conflicts: 0
    }
    addLog('同步开始...', 'info')
  }
})

function getLogType(status) {
  if (status.status === 'failed') return 'error'
  if (status.status === 'finished') return 'success'
  if (status.message?.includes('失败') || status.message?.includes('错误')) return 'error'
  if (status.message?.includes('成功') || status.message?.includes('完成')) return 'success'
  if (status.message?.includes('冲突')) return 'warning'
  return 'info'
}

function addLog(message, type = 'info') {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  logs.value.push({
    time,
    message,
    type
  })

  // 自动滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

function clearLogs() {
  logs.value = []
}

function handleClose() {
  if (isRunning.value) {
    return
  }
  emit('close')
}

// 暴露方法供父组件调用
defineExpose({
  addLog
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.progress-section {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-percent {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-primary);
}

.progress-bar {
  height: 8px;
  background: var(--bg-surface-hover);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-fill.progress-error {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.stage-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-surface-hover);
  border-radius: var(--radius-lg);
}

.stage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
}

.stage-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-color);
  z-index: 0;
}

.stage-item.active:not(:last-child)::after {
  background: var(--accent-primary);
}

.stage-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--border-color);
  border: 3px solid var(--bg-surface-hover);
  transition: all 0.3s;
  z-index: 1;
}

.stage-item.active .stage-dot {
  background: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary);
}

.stage-item span {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.stage-item.active span {
  color: var(--accent-primary);
  font-weight: 600;
}

.log-section {
  margin-bottom: 24px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-header span {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.clear-log-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-log-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.log-container {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: var(--bg-surface-hover);
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.5;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
  font-size: 12px;
}

.log-message {
  color: var(--text-secondary);
  flex: 1;
}

.log-item.info .log-message {
  color: var(--text-secondary);
}

.log-item.success .log-message {
  color: #10b981;
}

.log-item.error .log-message {
  color: #ef4444;
}

.log-item.warning .log-message {
  color: #f59e0b;
}

.log-empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 40px;
  font-size: 14px;
}

.stats-section {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-surface-hover);
  border-radius: var(--radius-lg);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-item.success .stat-value {
  color: #10b981;
}

.stat-item.failed .stat-value {
  color: #ef4444;
}

.stat-item.conflict .stat-value {
  color: #f59e0b;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.btn-close {
  background: var(--bg-surface-hover);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 24px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.btn-close:hover:not(:disabled) {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.btn-close:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
