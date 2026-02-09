<template>
  <div class="phone-usage-view">
    <div class="header">
      <h1>📱 手机使用看板</h1>
      <div class="header-actions">
        <select v-model="dateRange" @change="onRangeChange" class="range-select">
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="90">最近 90 天</option>
        </select>
        <button class="btn-secondary" @click="refreshData">🔄 刷新</button>
        <button class="btn-secondary" @click="goBack">← 返回</button>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner-large"></div>
        <p>加载数据中...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-state">
        <p>❌ {{ error }}</p>
        <button class="btn-primary" @click="refreshData">重试</button>
      </div>

      <!-- No Data -->
      <div v-else-if="!stats || stats.totalDays === 0" class="empty-state">
        <div class="empty-icon">📱</div>
        <h2>暂无数据</h2>
        <p>手机使用数据将在每日 19:00 自动同步</p>
        <p class="hint">或通过 POST /api/phone-usage/ingest 手动导入</p>
      </div>

      <!-- Dashboard -->
      <div v-else>
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card today">
            <div class="card-icon">📊</div>
            <div class="card-body">
              <div class="card-value">{{ formatMinutes(stats.today?.total_minutes || 0) }}</div>
              <div class="card-label">今日使用</div>
            </div>
            <div v-if="stats.today?.total_minutes >= 300" class="card-badge warn">⚠️</div>
            <div v-else-if="stats.today?.total_minutes > 0" class="card-badge good">✅</div>
          </div>

          <div class="summary-card avg">
            <div class="card-icon">📈</div>
            <div class="card-body">
              <div class="card-value">{{ formatMinutes(stats.avgDailyMinutes || 0) }}</div>
              <div class="card-label">日均使用</div>
            </div>
          </div>

          <div class="summary-card unlock">
            <div class="card-icon">🔓</div>
            <div class="card-body">
              <div class="card-value">{{ stats.avgDailyUnlocks || 0 }}次</div>
              <div class="card-label">日均解锁</div>
            </div>
          </div>

          <div class="summary-card top-app">
            <div class="card-icon">{{ stats.topApp?.emoji || '🏆' }}</div>
            <div class="card-body">
              <div class="card-value">{{ stats.topApp?.app_name || '-' }}</div>
              <div class="card-label">最常用 App</div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <!-- Category Pie Chart -->
          <div class="card chart-card">
            <h2>🥧 分类占比</h2>
            <div ref="pieChartRef" class="chart-container"></div>
          </div>

          <!-- Daily Trend -->
          <div class="card chart-card wide">
            <h2>📈 每日趋势</h2>
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
        </div>

        <!-- Unlock Trend -->
        <div class="card chart-card full-width">
          <h2>🔓 解锁次数趋势</h2>
          <div ref="unlockChartRef" class="chart-container-sm"></div>
        </div>

        <!-- Top Apps Table -->
        <div class="card">
          <h2>🏆 Top Apps（{{ dateRange }}天）</h2>
          <div class="apps-table">
            <div class="table-header">
              <span class="col-rank">#</span>
              <span class="col-app">应用</span>
              <span class="col-total">总计</span>
              <span class="col-avg">日均</span>
              <span class="col-days">使用天数</span>
            </div>
            <div v-for="(app, idx) in topApps" :key="app.app_name" class="table-row">
              <span class="col-rank">
                <span v-if="idx === 0">🥇</span>
                <span v-else-if="idx === 1">🥈</span>
                <span v-else-if="idx === 2">🥉</span>
                <span v-else>{{ idx + 1 }}</span>
              </span>
              <span class="col-app">
                <span class="app-emoji">{{ app.emoji || '📱' }}</span>
                {{ app.app_name }}
              </span>
              <span class="col-total">{{ formatMinutes(app.total_minutes) }}</span>
              <span class="col-avg">{{ formatMinutes(app.avg_minutes) }}</span>
              <span class="col-days">{{ app.days_used }}天</span>
            </div>
            <div v-if="topApps.length === 0" class="table-empty">暂无数据</div>
          </div>
        </div>

        <!-- Daily Details (expandable) -->
        <div class="card">
          <h2>📅 每日详情</h2>
          <div v-for="day in dailyData" :key="day.date" class="day-card" @click="toggleDay(day.date)">
            <div class="day-header">
              <span class="day-date">{{ day.date }}</span>
              <span class="day-total" :class="{ warn: day.total_minutes >= 300 }">
                {{ formatMinutes(day.total_minutes) }}
              </span>
              <span class="day-unlock">🔓 {{ day.unlock_count }}次</span>
              <span class="day-toggle">{{ expandedDays.has(day.date) ? '▾' : '▸' }}</span>
            </div>
            <div v-if="expandedDays.has(day.date)" class="day-detail">
              <div class="day-apps">
                <div v-for="app in day.apps" :key="app.app_name" class="day-app-row">
                  <span class="app-rank">{{ app.rank <= 3 ? ['🥇','🥈','🥉'][app.rank-1] : app.rank + '.' }}</span>
                  <span class="app-emoji">{{ app.emoji || '' }}</span>
                  <span class="app-name">{{ app.app_name }}</span>
                  <span class="app-time">{{ formatMinutes(app.minutes) }}</span>
                </div>
              </div>
              <div v-if="day.categories && day.categories.length" class="day-categories">
                <div class="cat-title">📊 分类：</div>
                <div v-for="cat in day.categories" :key="cat.category" class="day-cat-row">
                  <span>{{ cat.emoji }} {{ cat.category }}</span>
                  <span>{{ formatMinutes(cat.minutes) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="dailyData.length === 0" class="table-empty">暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()

const loading = ref(true)
const error = ref(null)
const dateRange = ref(30)
const stats = ref(null)
const topApps = ref([])
const dailyData = ref([])
const trendData = ref([])
const categoryData = ref([])
const expandedDays = reactive(new Set())

const pieChartRef = ref(null)
const trendChartRef = ref(null)
const unlockChartRef = ref(null)

let pieChart = null
let trendChart = null
let unlockChart = null

function formatMinutes(m) {
  if (!m || m === 0) return '0分钟'
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h > 0 && min > 0) return `${h}h${min}m`
  if (h > 0) return `${h}h`
  return `${min}m`
}

function getDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - dateRange.value)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const range = getDateRange()
    const [statsRes, trendsRes, catsRes, appsRes, dailyRes] = await Promise.all([
      fetch('/api/phone-usage/stats').then(r => r.json()),
      fetch(`/api/phone-usage/trends?days=${dateRange.value}`).then(r => r.json()),
      fetch(`/api/phone-usage/categories?start=${range.start}&end=${range.end}`).then(r => r.json()),
      fetch(`/api/phone-usage/top-apps?days=${dateRange.value}&limit=15`).then(r => r.json()),
      fetch(`/api/phone-usage/daily?start=${range.start}&end=${range.end}`).then(r => r.json())
    ])

    stats.value = statsRes
    trendData.value = trendsRes
    categoryData.value = catsRes
    topApps.value = appsRes
    dailyData.value = dailyRes

    await nextTick()
    renderCharts()
  } catch (err) {
    console.error('Failed to fetch phone usage data:', err)
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  renderPieChart()
  renderTrendChart()
  renderUnlockChart()
}

function renderPieChart() {
  if (!pieChartRef.value || categoryData.value.length === 0) return

  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.data.emoji} ${p.name}: ${formatMinutes(p.value)} (${p.percent}%)`
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#ccc' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#1a1d24',
        borderWidth: 2
      },
      label: {
        show: true,
        color: '#ccc',
        formatter: '{b}\n{d}%'
      },
      data: categoryData.value.map((c, i) => ({
        name: c.category,
        value: c.total_minutes,
        emoji: c.emoji,
        itemStyle: { color: colors[i % colors.length] }
      }))
    }]
  })
}

function renderTrendChart() {
  if (!trendChartRef.value || trendData.value.length === 0) return

  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const dates = trendData.value.map(d => d.date.slice(5)) // MM-DD
  const minutes = trendData.value.map(d => d.total_minutes)
  const hours = minutes.map(m => +(m / 60).toFixed(1))

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        const m = minutes[p.dataIndex]
        return `${trendData.value[p.dataIndex].date}<br/>📱 ${formatMinutes(m)}`
      }
    },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#999', rotate: dates.length > 14 ? 45 : 0 },
      axisLine: { lineStyle: { color: '#333' } }
    },
    yAxis: {
      type: 'value',
      name: '小时',
      nameTextStyle: { color: '#999' },
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#2a2d35' } }
    },
    series: [{
      type: 'bar',
      data: hours,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#5470c6' },
          { offset: 1, color: '#5470c644' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      markLine: {
        silent: true,
        data: [{ type: 'average', name: '平均' }],
        lineStyle: { color: '#ee6666', type: 'dashed' },
        label: { color: '#ee6666', formatter: '{c}h' }
      }
    }]
  })
}

function renderUnlockChart() {
  if (!unlockChartRef.value || trendData.value.length === 0) return

  if (unlockChart) unlockChart.dispose()
  unlockChart = echarts.init(unlockChartRef.value)

  const dates = trendData.value.map(d => d.date.slice(5))
  const unlocks = trendData.value.map(d => d.unlock_count)

  unlockChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return `${trendData.value[p.dataIndex].date}<br/>🔓 ${unlocks[p.dataIndex]}次`
      }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#999', rotate: dates.length > 14 ? 45 : 0 },
      axisLine: { lineStyle: { color: '#333' } }
    },
    yAxis: {
      type: 'value',
      name: '次',
      nameTextStyle: { color: '#999' },
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#2a2d35' } }
    },
    series: [{
      type: 'line',
      data: unlocks,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#91cc75', width: 2 },
      itemStyle: { color: '#91cc75' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#91cc7544' },
          { offset: 1, color: '#91cc7508' }
        ])
      }
    }]
  })
}

function toggleDay(date) {
  if (expandedDays.has(date)) {
    expandedDays.delete(date)
  } else {
    expandedDays.add(date)
  }
}

function onRangeChange() {
  fetchData()
}

function refreshData() {
  fetchData()
}

function goBack() {
  router.push('/')
}

function handleResize() {
  pieChart?.resize()
  trendChart?.resize()
  unlockChart?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  trendChart?.dispose()
  unlockChart?.dispose()
})
</script>

<style scoped>
.phone-usage-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.range-select {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--bg-tertiary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
}

/* Loading / Error / Empty */
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-tertiary);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: var(--text-secondary);
}

.hint {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.card-icon {
  font-size: 2rem;
}

.card-body {
  flex: 1;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.card-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 1rem;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card h2 {
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.chart-card {
  margin-bottom: 0;
}

.full-width {
  margin-bottom: 1.5rem;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.chart-container-sm {
  width: 100%;
  height: 200px;
}

/* Apps Table */
.apps-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 50px 1fr 100px 100px 80px;
  padding: 0.75rem 0;
  border-bottom: 2px solid var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.table-row {
  display: grid;
  grid-template-columns: 50px 1fr 100px 100px 80px;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--bg-tertiary);
  align-items: center;
  transition: background 0.15s;
}

.table-row:hover {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.col-rank {
  text-align: center;
  font-weight: 600;
}

.col-app {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-emoji {
  font-size: 1.1rem;
}

.col-total, .col-avg {
  font-weight: 500;
  color: var(--text-primary);
}

.col-days {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.table-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

/* Daily Details */
.day-card {
  border-bottom: 1px solid var(--bg-tertiary);
  cursor: pointer;
  transition: background 0.15s;
}

.day-card:hover {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 0.5rem;
}

.day-date {
  font-weight: 600;
  min-width: 100px;
}

.day-total {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 80px;
}

.day-total.warn {
  color: #ee6666;
}

.day-unlock {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.day-toggle {
  margin-left: auto;
  color: var(--text-secondary);
}

.day-detail {
  padding: 0.5rem 1rem 1rem;
}

.day-apps {
  margin-bottom: 0.75rem;
}

.day-app-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  font-size: 0.9rem;
}

.app-rank {
  min-width: 30px;
  text-align: center;
}

.app-name {
  flex: 1;
}

.app-time {
  font-weight: 500;
  color: var(--text-secondary);
}

.day-categories {
  padding-top: 0.5rem;
  border-top: 1px dashed var(--bg-tertiary);
}

.cat-title {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.day-cat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .phone-usage-view {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .table-header, .table-row {
    grid-template-columns: 40px 1fr 70px 70px 60px;
    font-size: 0.8rem;
  }
}
</style>
