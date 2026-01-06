import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/content/new',
    name: 'ContentNew',
    component: () => import('../views/ContentEditView.vue')
  },
  {
    path: '/content/:id',
    name: 'ContentDetail',
    component: () => import('../views/ContentDetailView.vue')
  },
  {
    path: '/content/:id/edit',
    name: 'ContentEdit',
    component: () => import('../views/ContentEditView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
