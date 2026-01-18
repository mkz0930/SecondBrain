import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/content/new',
    name: 'ContentNew',
    component: () => import('../views/ContentEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/content/:id',
    name: 'ContentDetail',
    component: () => import('../views/ContentDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/content/:id/edit',
    name: 'ContentEdit',
    component: () => import('../views/ContentEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/research',
    name: 'ResearchList',
    component: () => import('../views/ResearchListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/research/:id',
    name: 'ResearchDialogue',
    component: () => import('../views/ResearchDialogueView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/graph',
    name: 'KnowledgeGraph',
    component: () => import('../views/KnowledgeGraphView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/database',
    name: 'Database',
    component: () => import('../views/DatabaseView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !userStore.isAuthenticated) {
    // 需要认证但未登录，跳转到登录页
    next('/login')
  } else if (to.path === '/login' && userStore.isAuthenticated) {
    // 已登录用户访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
