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
  background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Background effects */
.login-container::before {
  content: "";
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%);
  top: -200px;
  right: -200px;
  border-radius: 50%;
}

.login-container::after {
  content: "";
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%);
  bottom: -100px;
  left: -100px;
  border-radius: 50%;
}

.login-card {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.login-title {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  text-align: center;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  font-size: 14px;
  color: #94a3b8;
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
  color: #cbd5e1;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
  color: #fff;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  background: rgba(15, 23, 42, 0.8);
}

.error-message {
  color: #f87171;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  filter: brightness(1.1);
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
  background: rgba(148, 163, 184, 0.2);
}

.divider span {
  position: relative;
  background: #1e293b; /* Match card bg roughly but solid for text cover */
  padding: 0 16px;
  color: #64748b;
  font-size: 14px;
  /* Since card is semi-transparent, this trick is tricky. 
     Better to make background transparent and add a small blur or solid color matching theme */
  background-color: transparent; 
  /* To hide line behind text properly on transparent bg is hard without solid bg.
     Let's just use text-shadow or small background patch */
  background: #1e232e; 
  border-radius: 4px;
}

.wechat-login {
  margin-top: 16px;
}

.wechat-button {
  width: 100%;
  padding: 12px;
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.wechat-button:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

.wechat-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
