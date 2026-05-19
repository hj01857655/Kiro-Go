<template>
  <Teleport to="body">
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none md:left-auto md:right-5">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'flex items-start gap-3 min-w-[300px] max-w-[500px] p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg pointer-events-auto border-l-4',
            toast.type === 'success' && 'border-l-success',
            toast.type === 'error' && 'border-l-error',
            toast.type === 'warning' && 'border-l-warning',
            toast.type === 'info' && 'border-l-info'
          ]"
        >
          <div
            :class="[
              'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-bold text-base',
              toast.type === 'success' && 'bg-green-100 dark:bg-green-900/30 text-success',
              toast.type === 'error' && 'bg-red-100 dark:bg-red-900/30 text-error',
              toast.type === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30 text-warning',
              toast.type === 'info' && 'bg-blue-100 dark:bg-blue-900/30 text-info'
            ]"
          >
            <span v-if="toast.type === 'success'">✓</span>
            <span v-else-if="toast.type === 'error'">✗</span>
            <span v-else-if="toast.type === 'warning'">⚠</span>
            <span v-else>ℹ</span>
          </div>
          <div class="flex-1 min-w-0">
            <div v-if="toast.title" class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">{{ toast.title }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 break-words">{{ toast.message }}</div>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 bg-transparent border-none text-xl text-gray-400 dark:text-gray-500 cursor-pointer p-0 w-5 h-5 leading-none hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            &times;
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

function addToast(options) {
  const toast = {
    id: nextId++,
    type: options.type || 'info',
    title: options.title || '',
    message: options.message || '',
    duration: options.duration || 3000
  }

  toasts.value.push(toast)

  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  return toast.id
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Expose methods
defineExpose({
  success: (message, title) => addToast({ type: 'success', message, title }),
  error: (message, title) => addToast({ type: 'error', message, title, duration: 5000 }),
  warning: (message, title) => addToast({ type: 'warning', message, title }),
  info: (message, title) => addToast({ type: 'info', message, title })
})
</script>

<style scoped>
/* Vue transition animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
