<template>
  <div
    ref="switcherRef"
    class="theme-switcher"
  >
    <button
      class="theme-button"
      :title="currentThemeLabel"
      @click.stop="togglePanel"
    >
      <span class="theme-icon">{{ currentThemeIcon }}</span>
    </button>

    <!-- 主题选择面板 -->
    <transition name="fade">
      <div
        v-if="showPanel"
        class="theme-panel"
        @click.stop
      >
        <div class="panel-section">
          <h3 class="section-title">
            🌍 环境主题
          </h3>
          <div class="theme-grid">
            <button
              v-for="(theme, key) in themeStore.environmentThemes"
              :key="key"
              class="theme-option"
              :class="{ active: themeStore.environment === key }"
              @click="selectEnvironment(key)"
            >
              <span class="option-icon">{{ theme.icon }}</span>
              <span class="option-name">{{ theme.name }}</span>
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">
            💭 心情主题
          </h3>
          <div class="theme-grid">
            <button
              v-for="(theme, key) in themeStore.moodThemes"
              :key="key"
              class="theme-option"
              :class="{ active: themeStore.mood === key }"
              @click="selectMood(key)"
            >
              <span class="option-icon">{{ theme.icon }}</span>
              <span class="option-name">{{ theme.name }}</span>
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">
            🎨 快捷预设
          </h3>
          <div class="preset-grid">
            <button
              v-for="(preset, key) in themeStore.themePresets"
              :key="key"
              class="preset-option"
              @click="selectPreset(key)"
            >
              <span class="preset-icon">{{ preset.icon }}</span>
              <span class="preset-name">{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <div class="panel-section options-section">
          <label class="option-label">
            <input
              v-model="themeStore.autoTheme"
              type="checkbox"
              @change="toggleAutoTheme"
            >
            <span>🕐 自动根据时间切换</span>
          </label>
          <label class="option-label">
            <input
              v-model="themeStore.followSystem"
              type="checkbox"
              @change="toggleFollowSystem"
            >
            <span>💻 跟随系统主题</span>
          </label>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const showPanel = ref(false)
const switcherRef = ref(null)

// 当前主题显示
const currentThemeIcon = computed(() => {
  const envIcon = themeStore.environmentThemes[themeStore.environment]?.icon || '🎨'
  const moodIcon = themeStore.moodThemes[themeStore.mood]?.icon || '✨'
  return `${envIcon}${moodIcon}`
})

const currentThemeLabel = computed(() => {
  const envName = themeStore.environmentThemes[themeStore.environment]?.name || ''
  const moodName = themeStore.moodThemes[themeStore.mood]?.name || ''
  return `${envName} - ${moodName}`
})

function togglePanel() {
  console.log('Toggle panel clicked, current state:', showPanel.value)
  showPanel.value = !showPanel.value
  console.log('New state:', showPanel.value)
}

function selectEnvironment(key) {
  console.log('Select environment:', key)
  themeStore.setEnvironment(key)
}

function selectMood(key) {
  console.log('Select mood:', key)
  themeStore.setMood(key)
}

function selectPreset(key) {
  console.log('Select preset:', key)
  themeStore.applyPreset(key)
}

function toggleAutoTheme() {
  themeStore.toggleAutoTheme(themeStore.autoTheme)
}

function toggleFollowSystem() {
  themeStore.toggleFollowSystem(themeStore.followSystem)
}

// 点击外部关闭面板
function handleClickOutside(event) {
  if (switcherRef.value && !switcherRef.value.contains(event.target)) {
    console.log('Click outside detected, closing panel')
    showPanel.value = false
  }
}

onMounted(() => {
  console.log('ThemeSwitcher mounted')
  console.log('Theme store:', themeStore)
  // 使用 setTimeout 延���添加监听器，避免与当前点击冲突
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.theme-switcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  display: inline-block;
}

/* 移动端调整位置，避免与 BackToTop 重叠 */
@media (max-width: 768px) {
  .theme-switcher {
    bottom: 90px;
    right: 16px;
  }
}

.theme-button {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 2px solid var(--border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 20px;
}

.theme-button:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-glow);
  transform: scale(1.05);
}

.theme-icon {
  font-size: 20px;
  line-height: 1;
}

/* 主题面板 */
.theme-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: var(--bg-surface);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-lg), 0 0 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  max-height: 80vh;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 主题网格 */
.theme-grid,
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.theme-option,
.preset-option {
  padding: 10px 8px;
  border-radius: var(--radius-md);
  background: var(--bg-body);
  border: 2px solid var(--border-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.theme-option:hover,
.preset-option:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.theme-option.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
  box-shadow: var(--shadow-glow);
  transform: scale(1.05);
}

.option-icon,
.preset-icon {
  font-size: 20px;
  line-height: 1;
}

.option-name,
.preset-name {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.preset-option {
  grid-column: span 1;
  flex-direction: row;
  justify-content: center;
  gap: 8px;
}

/* 选项区域 */
.options-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
  margin-top: 16px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: var(--text-primary);
  user-select: none;
}

.option-label:hover {
  background: var(--bg-surface-hover);
}

.option-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent-primary);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 滚动条 */
.theme-panel::-webkit-scrollbar {
  width: 6px;
}

.theme-panel::-webkit-scrollbar-track {
  background: var(--bg-body);
  border-radius: 3px;
}

.theme-panel::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.theme-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
