import axios from 'axios'
import { useUserStore } from '../stores/user'
import router from '../router'

const api = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response
  },
  error => {
    if (error.response) {
      console.error('API Error:', error.response.data)
      
      // 处理401未授权错误
      if (error.response.status === 401) {
        const userStore = useUserStore()
        userStore.clearAuth()
        
        // 如果当前不在登录页，跳转到登录页
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
