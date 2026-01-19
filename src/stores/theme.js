import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  applyTheme,
  loadThemeFromStorage,
  saveThemeToStorage,
  detectSystemTheme,
  recommendThemeByTime,
  environmentThemes,
  moodThemes,
  themePresets
} from '@/composables/useTheme'

export const useThemeStore = defineStore('theme', () => {
  // 当前主题配置
  const environment = ref('dark')
  const mood = ref('focus')
  const autoTheme = ref(false) // 是否自动根据时间切换
  const followSystem = ref(false) // 是否跟随系统主题

  /**
   * 初始化主题
   */
  function initTheme() {
    const saved = loadThemeFromStorage()
    environment.value = saved.environment || 'dark'
    mood.value = saved.mood || 'focus'
    applyCurrentTheme()
  }

  /**
   * 应用当前主题
   */
  function applyCurrentTheme() {
    applyTheme(environment.value, mood.value)
  }

  /**
   * 设置环境主题
   */
  function setEnvironment(env) {
    if (!environmentThemes[env]) {
      console.warn('Invalid environment theme:', env)
      return
    }
    environment.value = env
    applyCurrentTheme()
    saveTheme()
  }

  /**
   * 设置心情主题
   */
  function setMood(moodValue) {
    if (!moodThemes[moodValue]) {
      console.warn('Invalid mood theme:', moodValue)
      return
    }
    mood.value = moodValue
    applyCurrentTheme()
    saveTheme()
  }

  /**
   * 设置完整主题（环境 + 心情）
   */
  function setTheme(env, moodValue) {
    if (!environmentThemes[env] || !moodThemes[moodValue]) {
      console.warn('Invalid theme:', { env, moodValue })
      return
    }
    environment.value = env
    mood.value = moodValue
    applyCurrentTheme()
    saveTheme()
  }

  /**
   * 应用预设主题
   */
  function applyPreset(presetKey) {
    const preset = themePresets[presetKey]
    if (!preset) {
      console.warn('Invalid preset:', presetKey)
      return
    }
    setTheme(preset.environment, preset.mood)
  }

  /**
   * 切换自动主题（根据时间）
   */
  function toggleAutoTheme(enabled) {
    autoTheme.value = enabled
    if (enabled) {
      applyRecommendedTheme()
      startAutoThemeUpdater()
    } else {
      stopAutoThemeUpdater()
    }
    saveTheme()
  }

  /**
   * 切换跟随系统主题
   */
  function toggleFollowSystem(enabled) {
    followSystem.value = enabled
    if (enabled) {
      const systemTheme = detectSystemTheme()
      setEnvironment(systemTheme)
    }
    saveTheme()
  }

  /**
   * 应用推荐主题
   */
  function applyRecommendedTheme() {
    const recommended = recommendThemeByTime()
    setTheme(recommended.environment, recommended.mood)
  }

  /**
   * 保存主题配置
   */
  function saveTheme() {
    saveThemeToStorage(environment.value, mood.value)
  }

  // 自动主题更新定时器
  let autoThemeTimer = null

  function startAutoThemeUpdater() {
    stopAutoThemeUpdater()
    // 每小时检查一次
    autoThemeTimer = setInterval(() => {
      if (autoTheme.value) {
        applyRecommendedTheme()
      }
    }, 60 * 60 * 1000)
  }

  function stopAutoThemeUpdater() {
    if (autoThemeTimer) {
      clearInterval(autoThemeTimer)
      autoThemeTimer = null
    }
  }

  // 监听主题变化
  watch([environment, mood], () => {
    applyCurrentTheme()
  })

  // 监听系统主题变化
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (followSystem.value) {
        const systemTheme = detectSystemTheme()
        setEnvironment(systemTheme)
      }
    })
  }

  return {
    // 状态
    environment,
    mood,
    autoTheme,
    followSystem,

    // 方法
    initTheme,
    setEnvironment,
    setMood,
    setTheme,
    applyPreset,
    toggleAutoTheme,
    toggleFollowSystem,
    applyRecommendedTheme,

    // 工具
    environmentThemes,
    moodThemes,
    themePresets
  }
})
