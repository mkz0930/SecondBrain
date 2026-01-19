/**
 * 主题系统配置
 * 支持环境主题和心情主题的组合
 */

// 环境主题（基础亮度）
export const environmentThemes = {
  dark: {
    name: '暗色环境',
    icon: '🌙',
    description: '适合夜间使用，护眼舒适',
    cssVars: {
      // 核心背景
      '--bg-body': '#0a0c10',
      '--bg-surface': '#151820',
      '--bg-surface-hover': '#1f2430',
      '--bg-surface-active': '#2a3040',

      // 文字颜色
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#cbd5e1',
      '--text-tertiary': '#94a3b8',

      // 边框
      '--border-color': '#334155',
      '--border-hover': '#475569',
    }
  },
  light: {
    name: '明亮环境',
    icon: '☀️',
    description: '适合白天使用，清晰明亮',
    cssVars: {
      '--bg-body': '#fafbfc',
      '--bg-surface': '#ffffff',
      '--bg-surface-hover': '#f8fafc',
      '--bg-surface-active': '#f1f5f9',

      '--text-primary': '#0f172a',
      '--text-secondary': '#334155',
      '--text-tertiary': '#64748b',

      '--border-color': '#cbd5e1',
      '--border-hover': '#94a3b8',
    }
  },
  normal: {
    name: '普通环境',
    icon: '🌤️',
    description: '平衡色调，适合日常使用',
    cssVars: {
      '--bg-body': '#e2e8f0',
      '--bg-surface': '#f1f5f9',
      '--bg-surface-hover': '#e2e8f0',
      '--bg-surface-active': '#cbd5e1',

      '--text-primary': '#1e293b',
      '--text-secondary': '#475569',
      '--text-tertiary': '#64748b',

      '--border-color': '#94a3b8',
      '--border-hover': '#64748b',
    }
  }
}

// 心情主题（强调色和氛围）
export const moodThemes = {
  focus: {
    name: '专注',
    icon: '🎯',
    description: '专注高效，冷色调提升注意力',
    cssVars: {
      '--accent-primary': '#60a5fa',
      '--accent-secondary': '#38bdf8',
      '--accent-glow': 'rgba(96, 165, 250, 0.5)',
      '--shadow-glow': '0 0 20px rgba(96, 165, 250, 0.25)',
    }
  },
  inspiration: {
    name: '灵感',
    icon: '✨',
    description: '激发创意，紫色调富有想象力',
    cssVars: {
      '--accent-primary': '#a78bfa',
      '--accent-secondary': '#f472b6',
      '--accent-glow': 'rgba(167, 139, 250, 0.5)',
      '--shadow-glow': '0 0 20px rgba(167, 139, 250, 0.25)',
    }
  },
  childish: {
    name: '童真',
    icon: '🌈',
    description: '活泼可爱，多彩充满活力',
    cssVars: {
      '--accent-primary': '#fbbf24',
      '--accent-secondary': '#fb923c',
      '--accent-glow': 'rgba(251, 191, 36, 0.5)',
      '--shadow-glow': '0 0 20px rgba(251, 191, 36, 0.25)',
    }
  },
  mature: {
    name: '成熟',
    icon: '🌿',
    description: '沉稳优雅，绿色调自然舒适',
    cssVars: {
      '--accent-primary': '#34d399',
      '--accent-secondary': '#10b981',
      '--accent-glow': 'rgba(52, 211, 153, 0.5)',
      '--shadow-glow': '0 0 20px rgba(52, 211, 153, 0.25)',
    }
  }
}

// 主题预设组合
export const themePresets = {
  'dark-focus': {
    name: '暗夜专注',
    icon: '🌙🎯',
    description: '夜间高效工作模式',
    environment: 'dark',
    mood: 'focus'
  },
  'light-inspiration': {
    name: '明亮灵感',
    icon: '☀️✨',
    description: '日间创意思考模式',
    environment: 'light',
    mood: 'inspiration'
  },
  'normal-childish': {
    name: '日常童真',
    icon: '🌤️🌈',
    description: '轻松愉快的日常模式',
    environment: 'normal',
    mood: 'childish'
  },
  'dark-mature': {
    name: '暗夜沉稳',
    icon: '🌙🌿',
    description: '夜间深沉思考模式',
    environment: 'dark',
    mood: 'mature'
  }
}

/**
 * 应用主题到 document
 */
export function applyTheme(environment, mood) {
  const envTheme = environmentThemes[environment]
  const moodTheme = moodThemes[mood]

  if (!envTheme || !moodTheme) {
    console.warn('Invalid theme:', { environment, mood })
    return
  }

  // 合并并应用 CSS 变量
  const cssVars = { ...envTheme.cssVars, ...moodTheme.cssVars }

  Object.entries(cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
}

/**
 * 从 localStorage 加载主题
 */
export function loadThemeFromStorage() {
  try {
    const saved = localStorage.getItem('theme-preference')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load theme from storage:', error)
  }

  // 默认主题
  return {
    environment: 'dark',
    mood: 'focus'
  }
}

/**
 * 保存主题到 localStorage
 */
export function saveThemeToStorage(environment, mood) {
  try {
    localStorage.setItem('theme-preference', JSON.stringify({ environment, mood }))
  } catch (error) {
    console.warn('Failed to save theme to storage:', error)
  }
}

/**
 * 检测系统主题偏好
 */
export function detectSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

/**
 * 根据时间自动推荐主题
 */
export function recommendThemeByTime() {
  const hour = new Date().getHours()

  // 早晨 (6-11): 明亮 + 灵感
  if (hour >= 6 && hour < 11) {
    return { environment: 'light', mood: 'inspiration' }
  }
  // 下午 (11-18): 明亮 + 专注
  if (hour >= 11 && hour < 18) {
    return { environment: 'light', mood: 'focus' }
  }
  // 晚上 (18-22): 普通 + 成熟
  if (hour >= 18 && hour < 22) {
    return { environment: 'normal', mood: 'mature' }
  }
  // 深夜 (22-6): 暗色 + 专注
  return { environment: 'dark', mood: 'focus' }
}
