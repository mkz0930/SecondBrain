<template>
  <div id="app">
    <div
      v-if="hasError"
      class="global-error-boundary"
    >
      <div class="error-content">
        <h2>应用遇到错误</h2>
        <pre class="error-message">{{ errorMessage }}</pre>
        <button
          class="btn-retry"
          @click="reload"
        >
          刷新页面
        </button>
      </div>
    </div>
    <template v-else>
      <router-view />
      <BackToTop />
      <ThemeSwitcher />
    </template>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured, onMounted } from 'vue'
import BackToTop from './components/BackToTop.vue'
import ThemeSwitcher from './components/ThemeSwitcher.vue'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
const hasError = ref(false)
const errorMessage = ref('')

// 初始化主题
onMounted(() => {
  themeStore.initTheme()
})

onErrorCaptured((err) => {
  console.error('App Error Captured:', err)
  hasError.value = true
  errorMessage.value = err.message || '未知错误'
  return false // 阻止错误继续向上传播
})

function reload() {
  hasError.value = false
  window.location.reload()
}
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.global-error-boundary {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-content {
  background: #1e293b;
  padding: 40px;
  border-radius: 16px;
  border: 1px solid #ef4444;
  text-align: center;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.error-content h2 {
  color: #ef4444;
  margin-bottom: 20px;
  font-size: 24px;
}

.error-message {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  color: #e2e8f0;
  text-align: left;
  overflow: auto;
  margin-bottom: 25px;
  font-family: monospace;
  white-space: pre-wrap;
}

.btn-retry {
  background: #3b82f6;
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #2563eb;
}
</style>
