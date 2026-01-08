import { defineStore } from 'pinia'
import { ref } from 'vue'

const TOKEN_STORAGE_KEY = 'auth_token'

export const useUserStore = defineStore('user', () => {
  const token = ref(null)
  const userInfo = ref(null)
  const isAuthenticated = ref(false)

  function loadToken() {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (savedToken) {
      token.value = savedToken
      isAuthenticated.value = true
    }
  }

  function setAuth(authData) {
    token.value = authData.token
    userInfo.value = {
      id: authData.user_id,
      username: authData.username || null
    }
    isAuthenticated.value = true
    localStorage.setItem(TOKEN_STORAGE_KEY, authData.token)
  }

  function clearAuth() {
    token.value = null
    userInfo.value = null
    isAuthenticated.value = false
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  // 初始化时加载token
  loadToken()

  return {
    token,
    userInfo,
    isAuthenticated,
    setAuth,
    clearAuth,
    loadToken
  }
})
