<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">外挂大脑</h1>
      <p class="login-subtitle">个人知识管理系统</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="请输入用户名"
            required
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="请输入密码"
            required
            autocomplete="current-password"
          />
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="login-button" :disabled="isLoading">
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="divider">
        <span>或</span>
      </div>
      
      <div class="wechat-login">
        <button type="button" class="wechat-button" disabled>
          微信登录（暂未配置）
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import api from '../utils/api'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = '请输入用户名和密码'
    return
  }
  
  errorMessage.value = ''
  isLoading.value = true
  
  try {
    const response = await api.post('/api/auth/login', {
      username: username.value,
      password: password.value
    })
    
    userStore.setAuth(response.data)
    
    // 登录成功，跳转到首页
    router.push('/')
  } catch (error) {
    console.error('Login failed:', error)
    
    if (error.response?.data?.error) {
      errorMessage.value = error.response.data.error === 'Invalid username or password'
        ? '用户名或密码错误'
        : error.response.data.error
    } else {
      errorMessage.value = '登录失败，请稍后重试'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 32px;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 10px;
  background: #ffe6e6;
  border-radius: 6px;
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 24px 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
}

.divider span {
  position: relative;
  background: white;
  padding: 0 16px;
  color: #999;
  font-size: 14px;
}

.wechat-login {
  margin-top: 16px;
}

.wechat-button {
  width: 100%;
  padding: 12px;
  background: #09bb07;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.wechat-button:hover:not(:disabled) {
  background: #08a006;
}

.wechat-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
