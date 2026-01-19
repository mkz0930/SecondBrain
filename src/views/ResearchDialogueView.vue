<template>
  <div class="research-dialogue-view">
    <div class="header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">← 返回</button>
        <div class="project-info">
          <h1>{{ project?.title || '加载中...' }}</h1>
          <span class="status-badge" :class="getStatusClass(project?.status)">
            {{ getStatusText(project?.status) }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="showMaterials = !showMaterials">
          📚 资料 ({{ project?.materials?.length || 0 }})
        </button>
        <button class="btn-secondary" @click="showGraph = !showGraph">
          🕸️ 知识图谱
        </button>
        <button class="btn-primary" @click="handleGenerateReport" :disabled="loading || project?.status !== 'analyzing'">
          📄 生成报告
        </button>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧：对话区域 -->
      <div class="dialogue-area">
        <div class="dialogue-container" ref="dialogueContainer">
          <!-- 项目描述 -->
          <div class="message-group" v-if="project?.description">
            <div class="message system-message">
              <div class="message-icon">🎯</div>
              <div class="message-content">
                <strong>研究目标：</strong>{{ project.description }}
              </div>
            </div>
          </div>

          <!-- 问题列表 -->
          <div class="message-group" v-for="question in questions" :key="question.id">
            <div class="message assistant-message">
              <div class="message-icon">🤖</div>
              <div class="message-content">
                <strong>问题 {{ question.order_index }}：</strong>{{ question.question }}
              </div>
            </div>

            <div class="message user-message" v-if="question.answer">
              <div class="message-icon">👤</div>
              <div class="message-content">
                {{ question.answer }}
              </div>
            </div>

            <!-- 回答输入框 -->
            <div class="answer-input-area" v-if="!question.answer && question.status === 'pending'">
              <textarea
                v-model="currentAnswer"
                placeholder="请输入你的回答..."
                class="answer-textarea"
                rows="3"
                @keydown.ctrl.enter="submitAnswer(question.id)"
              ></textarea>
              <button class="btn-submit" @click="submitAnswer(question.id)" :disabled="!currentAnswer.trim()">
                提交回答
              </button>
            </div>
          </div>

          <!-- 操作提示 -->
          <div class="action-hints" v-if="project">
            <div class="hint-card" v-if="project.status === 'draft'">
              <div class="hint-icon">💡</div>
              <div class="hint-content">
                <strong>开始研究</strong>
                <p>点击下方按钮开始需求分析，AI 将帮你生成研究问题。</p>
                <button class="btn-primary" @click="handleAnalyzeRequirements" :disabled="loading">
                  {{ loading ? '分析中...' : '开始需求分析' }}
                </button>
              </div>
            </div>

            <div class="hint-card" v-if="project.status === 'analyzing' && allQuestionsAnswered">
              <div class="hint-icon">📚</div>
              <div class="hint-content">
                <strong>收集资料</strong>
                <p>所有问题已回答，现在可以开始收集相关资料。</p>
                <button class="btn-primary" @click="handleCollectMaterials" :disabled="loading">
                  {{ loading ? '收集中...' : '开始收集资料' }}
                </button>
              </div>
            </div>

            <div class="hint-card" v-if="project.status === 'researching'">
              <div class="hint-icon">🔍</div>
              <div class="hint-content">
                <strong>分析资料</strong>
                <p>资料已收集，现在可以分析资料之间的关联关系。</p>
                <button class="btn-primary" @click="handleProcessMaterials" :disabled="loading">
                  {{ loading ? '分析中...' : '开始分析资料' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 加载状态 -->
          <div class="loading-message" v-if="loading">
            <div class="spinner"></div>
            <span>处理中...</span>
          </div>
        </div>
      </div>

      <!-- 右侧：资料面板 -->
      <div class="side-panel" v-if="showMaterials">
        <div class="panel-header">
          <h3>📚 收集的资料</h3>
          <button class="btn-close" @click="showMaterials = false">×</button>
        </div>
        <div class="panel-content">
          <div v-if="!project?.materials || project.materials.length === 0" class="empty-state">
            暂无资料
          </div>
          <div v-else class="materials-list">
            <div
              v-for="material in sortedMaterials"
              :key="material.id"
              class="material-card"
              @click="selectedMaterial = material">
              <div class="material-header">
                <span class="material-type">{{ getMaterialTypeIcon(material.type) }}</span>
                <span class="material-relevance">{{ (material.relevance_score * 100).toFixed(0) }}%</span>
              </div>
              <h4>{{ material.title }}</h4>
              <p class="material-source">{{ material.source }}</p>
              <p class="material-preview">{{ truncate(material.content, 100) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 知识图谱面板 -->
      <div class="side-panel graph-panel" v-if="showGraph">
        <div class="panel-header">
          <h3>🕸️ 知识图谱</h3>
          <button class="btn-close" @click="showGraph = false">×</button>
        </div>
        <div class="panel-content">
          <KnowledgeGraph v-if="graphData" :data="graphData" />
          <div v-else class="empty-state">
            <p>暂无图谱数据</p>
            <button class="btn-secondary" @click="loadGraphData">加载图谱</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 资料详情模态框 -->
    <div v-if="selectedMaterial" class="modal-overlay" @click="selectedMaterial = null">
      <div class="modal-content material-detail" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedMaterial.title }}</h2>
          <button class="btn-close" @click="selectedMaterial = null">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-meta">
            <span class="meta-item">
              <strong>类型：</strong>{{ getMaterialTypeName(selectedMaterial.type) }}
            </span>
            <span class="meta-item">
              <strong>相关度：</strong>{{ (selectedMaterial.relevance_score * 100).toFixed(0) }}%
            </span>
            <span class="meta-item">
              <strong>来源：</strong>{{ selectedMaterial.source }}
            </span>
          </div>
          <div class="detail-content">
            <pre>{{ selectedMaterial.content }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 报告模态框 -->
    <div v-if="showReport" class="modal-overlay" @click="showReport = false">
      <div class="modal-content report-modal" @click.stop>
        <div class="modal-header">
          <h2>📄 研究报告</h2>
          <button class="btn-close" @click="showReport = false">×</button>
        </div>
        <div class="modal-body">
          <div class="report-content" v-html="renderedReport"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="copyReport">复制报告</button>
          <button class="btn-primary" @click="showReport = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useResearchStore } from '../stores/research'
import { truncateText } from '../utils/helpers'
import MarkdownIt from 'markdown-it'
import KnowledgeGraph from '../components/KnowledgeGraph.vue'

const router = useRouter()
const route = useRoute()
const researchStore = useResearchStore()

const md = new MarkdownIt()

const project = ref(null)
const currentAnswer = ref('')
const showMaterials = ref(false)
const showGraph = ref(false)
const selectedMaterial = ref(null)
const showReport = ref(false)
const reportContent = ref('')
const graphData = ref(null)
const dialogueContainer = ref(null)

const loading = computed(() => researchStore.loading)

const questions = computed(() => {
  return project.value?.questions || []
})

const allQuestionsAnswered = computed(() => {
  return questions.value.length > 0 && questions.value.every(q => q.answer)
})

const sortedMaterials = computed(() => {
  if (!project.value?.materials) return []
  return [...project.value.materials].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
})

const renderedReport = computed(() => {
  return md.render(reportContent.value)
})

onMounted(async () => {
  const projectId = route.params.id
  try {
    project.value = await researchStore.fetchProjectDetail(projectId)
  } catch (err) {
    alert('加载项目失败：' + err.message)
    router.push('/research')
  }
})

watch(() => project.value, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

function scrollToBottom() {
  if (dialogueContainer.value) {
    dialogueContainer.value.scrollTop = dialogueContainer.value.scrollHeight
  }
}

function goBack() {
  router.push('/research')
}

async function handleAnalyzeRequirements() {
  try {
    await researchStore.analyzeRequirements(project.value.id)
    project.value = await researchStore.fetchProjectDetail(project.value.id)
  } catch (err) {
    alert('需求分析失败：' + err.message)
  }
}

async function submitAnswer(questionId) {
  if (!currentAnswer.value.trim()) return

  try {
    const result = await researchStore.answerQuestion(
      project.value.id,
      questionId,
      currentAnswer.value
    )

    currentAnswer.value = ''
    project.value = await researchStore.fetchProjectDetail(project.value.id)

    if (result.needMoreInfo && result.newQuestions.length > 0) {
      // 有新问题生成
      console.log('生成了新问题:', result.newQuestions)
    }
  } catch (err) {
    alert('提交回答失败：' + err.message)
  }
}

async function handleCollectMaterials() {
  try {
    await researchStore.collectMaterials(project.value.id, 'local')
    project.value = await researchStore.fetchProjectDetail(project.value.id)
    showMaterials.value = true
  } catch (err) {
    alert('收集资料失败：' + err.message)
  }
}

async function handleProcessMaterials() {
  try {
    await researchStore.processMaterials(project.value.id)
    project.value = await researchStore.fetchProjectDetail(project.value.id)
  } catch (err) {
    alert('分析资料失败：' + err.message)
  }
}

async function handleGenerateReport() {
  try {
    const result = await researchStore.generateReport(project.value.id)
    reportContent.value = result.report
    showReport.value = true
    project.value = await researchStore.fetchProjectDetail(project.value.id)
  } catch (err) {
    alert('生成报告失败：' + err.message)
  }
}

async function loadGraphData() {
  try {
    graphData.value = await researchStore.fetchKnowledgeGraph(project.value.id)
  } catch (err) {
    alert('加载图谱失败：' + err.message)
  }
}

function copyReport() {
  navigator.clipboard.writeText(reportContent.value)
  alert('报告已复制到剪贴板')
}

function truncate(text, length) {
  return truncateText(text, length)
}

function getStatusText(status) {
  const statusMap = {
    draft: '草稿',
    analyzing: '分析中',
    researching: '研究中',
    done: '已完成'
  }
  return statusMap[status] || status
}

function getStatusClass(status) {
  return `status-${status}`
}

function getMaterialTypeIcon(type) {
  const iconMap = {
    local: '📝',
    network: '🌐',
    file: '📄'
  }
  return iconMap[type] || '📄'
}

function getMaterialTypeName(type) {
  const nameMap = {
    local: '本地内容',
    network: '网络资源',
    file: '文件'
  }
  return nameMap[type] || type
}
</script>

<style scoped>
.research-dialogue-view {
  min-height: 100vh;
  background: radial-gradient(circle at top left, #1e293b 0%, var(--bg-body) 40%),
              radial-gradient(circle at bottom right, #1e1b4b 0%, var(--bg-body) 40%);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(26, 29, 36, 0.8);
  padding: 20px 40px;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--accent-primary);
}

.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-info h1 {
  font-size: 20px;
  margin: 0;
  color: var(--text-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.status-draft {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

.status-analyzing {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.status-researching {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.status-done {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.dialogue-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialogue-container {
  flex: 1;
  overflow-y: auto;
  padding: 30px 40px;
}

.message-group {
  margin-bottom: 32px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.system-message {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.assistant-message {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.user-message {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  margin-left: 40px;
}

.message-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  line-height: 1.6;
  color: var(--text-primary);
}

.message-content strong {
  color: var(--accent-primary);
  margin-right: 8px;
}

.answer-input-area {
  margin-left: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
}

.answer-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-submit {
  align-self: flex-end;
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: var(--accent-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-hints {
  margin-top: 24px;
}

.hint-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.hint-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.hint-content {
  flex: 1;
}

.hint-content strong {
  display: block;
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.hint-content p {
  margin: 0 0 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.loading-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  border-top-color: var(--accent-primary);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.side-panel {
  width: 400px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.graph-panel {
  width: 600px;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.material-card {
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.material-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.material-type {
  font-size: 20px;
}

.material-relevance {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.material-card h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.material-source {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0 0 8px;
}

.material-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Modal styles */
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
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
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

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.meta-item {
  font-size: 14px;
  color: var(--text-secondary);
}

.meta-item strong {
  color: var(--text-primary);
  margin-right: 4px;
}

.detail-content pre {
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
}

.report-content {
  line-height: 1.8;
  color: var(--text-primary);
}

.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  color: var(--text-primary);
  margin-top: 24px;
  margin-bottom: 12px;
}

.report-content :deep(p) {
  margin-bottom: 16px;
}

.report-content :deep(ul),
.report-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.report-content :deep(code) {
  background: var(--bg-body);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
