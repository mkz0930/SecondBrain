<template>
  <transition name="fade">
    <button 
      v-show="isVisible" 
      class="back-to-top" 
      @click="scrollToTop"
      aria-label="返回顶部"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="3" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isVisible = ref(false)
const threshold = 300

const checkScroll = () => {
  isVisible.value = window.scrollY > threshold
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', checkScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4), 
              0 0 0 2px rgba(255, 255, 255, 0.1) inset;
  z-index: 999;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  backdrop-filter: blur(4px);
}

.back-to-top:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.6),
              0 0 0 2px rgba(255, 255, 255, 0.2) inset;
}

.back-to-top:active {
  transform: translateY(-2px) scale(0.95);
}

.back-to-top svg {
  transition: transform 0.3s ease;
}

.back-to-top:hover svg {
  transform: translateY(-3px);
}

/* Vue Transition Styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>