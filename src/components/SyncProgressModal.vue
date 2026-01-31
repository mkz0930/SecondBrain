<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="handleClose"
  >
    <div class="modal-container">
      <div class="modal-header">
        <h2>飞书同步进度</h2>
        <button
          class="close-btn"
          :disabled="isRunning"
          @click="handleClose"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        <!-- 总体进度 -->
        <div class="progress-section">
          <div class="progress-info">
            <span class="progress-label">{{ status.message || '准备同步...' }}</span>
            <span
              class="progress-percent"
              :class="{ 'pulse': isRunning }"
            >{{ status.progress || 0 }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: (status.progress || 0) + '%' }"
              :class="{
                'progress-error': status.status === 'failed',
                'progress-success': status.status === 'finished'
              }"
            />
            <div
              v-if="isRunning"
              class="progress-glow"
              :style="{ left: (status.progress || 0) + '%' }"
            />
          </div>
        </div>

        <!-- 同步阶段指示 -->
        <div
          v-if="status.stage"
          class="stage-indicator"
        >
          <div
            class="stage-item"
            :class="getStageClass('init')"
          >
            <div class="stage-dot">
              <svg
                v-if="isStageCompleted('init')"
                class="check-icon"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span
                v-else
                class="stage-number"
              >1</span>
            </div>
            <span>初始化</span>
          </div>
          <div
            class="stage-line"
            :class="{ completed: isStageCompleted('init') }"
          />
          <div
            class="stage-item"
            :class="getStageClass('pushing')"
          >
            <div class="stage-dot">
              <svg
                v-if="isStageCompleted('pushing')"
                class="check-icon"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span
                v-else
                class="stage-number"
              >2</span>
            </div>
            <span>推送到飞书</span>
          </div>
          <div
            class="stage-line"
            :class="{ completed: isStageCompleted('pushing') }"
          />
          <div
            class="stage-item"
            :class="getStageClass('pulling')"
          >
            <div class="stage-dot">
              <svg
                v-if="isStageCompleted('pulling')"
                class="check-icon"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span
                v-else
                class="stage-number"
              >3</span>
            </div>
            <span>拉取到本地</span>
          </div>
          <div
            class="stage-line"
            :class="{ completed: isStageCompleted('pulling') }"
          />
          <div
            class="stage-item"
            :class="getStageClass('finished')"
          >
            <div class="stage-dot">
              <svg
                v-if="status.stage === 'finished'"
                class="check-icon"
                viewBox="0 0 24 24"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span
                v-else
                class="stage-number"
              >4</span>
            </div>
            <span>完成</span>
          </div>
        </div>

        <!-- 详细日志 -->
        <div class="log-section">
          <div class="log-header">
            <span>同步日志</span>
            <button
              v-if="logs.length > 0"
              class="clear-log-btn"
              @click="clearLogs"
            >
              清空
            </button>
          </div>
          <div
            ref="logContainer"
            class="log-container"
          >
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="log-item"
              :class="log.type"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div
              v-if="logs.length === 0"
              class="log-empty"
            >
              等待同步开始...
            </div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div
          v-if="stats.total > 0 || isRunning"
          class="stats-section"
        >
          <div class="stat-item">
            <span class="stat-label">总计</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div
            v-if="processingCount > 0"
            class="stat-item processing"
          >
            <span class="stat-label">进行中</span>
            <span class="stat-value">{{ processingCount }}</span>
          </div>
          <div class="stat-item success">
            <span class="stat-label">成功</span>
            <span class="stat-value">{{ stats.success }}</span>
          </div>
          <div
            v-if="stats.failed > 0"
            class="stat-item failed"
          >
            <span class="stat-label">失败</span>
            <span class="stat-value">{{ stats.failed }}</span>
          </div>
          <div
            v-if="stats.conflicts > 0"
            class="stat-item conflict"
          >
            <span class="stat-label">冲突</span>
            <span class="stat-value">{{ stats.conflicts }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn-close"
          :disabled="isRunning"
          @click="handleClose"
        >
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

// 计算进行中的数量
const processingCount = computed(() => {
  return Math.max(0, stats.value.total - stats.value.success - stats.value.failed - stats.value.conflicts)
})

// 阶段顺序
const stageOrder = ['init', 'pushing', 'pulling', 'finished']

// 判断阶段是否已完成
function isStageCompleted(stage) {
  const currentIndex = stageOrder.indexOf(props.status.stage)
  const stageIndex = stageOrder.indexOf(stage)
  return currentIndex > stageIndex
}

// 获取阶段的CSS类
function getStageClass(stage) {
  const currentIndex = stageOrder.indexOf(props.status.stage)
  const stageIndex = stageOrder.indexOf(stage)

  if (currentIndex > stageIndex) {
    return 'completed'
  } else if (currentIndex === stageIndex) {
    return 'active'
  }
  return ''
}

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
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-primary);
  font-variant-numeric: tabular-nums;
}

.progress-percent.pulse {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.progress-bar {
  height: 10px;
  background: var(--bg-surface-hover);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width 0.3s ease;
  border-radius: 5px;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-fill.progress-error {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.progress-fill.progress-error::after {
  display: none;
}

.progress-fill.progress-success {
  background: linear-gradient(90deg, #10b981, #059669);
}

.progress-fill.progress-success::after {
  display: none;
}

.progress-glow {
  position: absolute;
  top: -2px;
  width: 20px;
  height: 14px;
  background: var(--accent-primary);
  border-radius: 50%;
  filter: blur(8px);
  opacity: 0.6;
  transform: translateX(-50%);
  pointer-events: none;
}

.stage-indicator {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 20px 16px;
  background: var(--bg-surface-hover);
  border-radius: var(--radius-lg);
}

.stage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 70px;
}

.stage-line {
  flex: 1;
  height: 3px;
  background: var(--border-color);
  margin-top: 14px;
  border-radius: 2px;
  transition: all 0.3s ease;
  min-width: 30px;
}

.stage-line.completed {
  background: linear-gradient(90deg, #10b981, #059669);
}

.stage-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 3px solid var(--border-color);
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.stage-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.check-icon {
  width: 16px;
  height: 16px;
  stroke: white;
  stroke-width: 3;
  fill: none;
}

.stage-item.active .stage-dot {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 16px var(--accent-primary);
  animation: stage-pulse 2s ease-in-out infinite;
}

.stage-item.active .stage-number {
  color: white;
}

@keyframes stage-pulse {
  0%, 100% { box-shadow: 0 0 8px var(--accent-primary); }
  50% { box-shadow: 0 0 20px var(--accent-primary); }
}

.stage-item.completed .stage-dot {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.stage-item.completed .check-icon {
  stroke: white;
}

.stage-item.completed .stage-number {
  display: none;
}

.stage-item span:not(.stage-number) {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  text-align: center;
}

.stage-item.active span:not(.stage-number) {
  color: var(--accent-primary);
  font-weight: 600;
}

.stage-item.completed span:not(.stage-number) {
  color: #10b981;
  font-weight: 500;
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

.stat-item.processing .stat-value {
  color: var(--accent-primary);
  animation: pulse-glow 1.5s ease-in-out infinite;
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
