<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="isVisible" class="fixed inset-0 w-full h-full bg-black/60 flex items-center justify-center z-[10000] backdrop-blur" @click.self="handleCancel">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 w-[90%] max-w-[480px] shadow-2xl flex flex-col items-center gap-5 md:p-8">
          <div
            :class="[
              'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
              type === 'danger' && 'bg-red-100 dark:bg-red-900/30',
              type === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30',
              type === 'info' && 'bg-gray-100 dark:bg-gray-700'
            ]"
          >
            <span v-if="type === 'danger'">⚠️</span>
            <span v-else-if="type === 'warning'">⚡</span>
            <span v-else>❓</span>
          </div>
          <div class="text-center w-full">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{{ title }}</h3>
            <p class="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">{{ message }}</p>
          </div>
          <div class="flex gap-3 w-full mt-2 md:flex-row flex-col-reverse">
            <button @click="handleCancel" class="btn-secondary flex-1 py-3 px-6 text-[15px] font-semibold">
              {{ cancelText }}
            </button>
            <button @click="handleConfirm" :class="[confirmButtonClass, 'flex-1 py-3 px-6 text-[15px] font-semibold']">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const isVisible = ref(false)
const title = ref('')
const message = ref('')
const type = ref('info')
const confirmText = ref('Confirm')
const cancelText = ref('Cancel')
let resolvePromise = null

const confirmButtonClass = computed(() => {
  switch (type.value) {
    case 'danger':
      return 'btn-danger'
    case 'warning':
      return 'btn-warning'
    default:
      return 'btn-primary'
  }
})

function show(options) {
  title.value = options.title || 'Confirm'
  message.value = options.message || 'Are you sure?'
  type.value = options.type || 'info'
  confirmText.value = options.confirmText || 'Confirm'
  cancelText.value = options.cancelText || 'Cancel'
  isVisible.value = true

  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function handleConfirm() {
  isVisible.value = false
  if (resolvePromise) {
    resolvePromise(true)
    resolvePromise = null
  }
}

function handleCancel() {
  isVisible.value = false
  if (resolvePromise) {
    resolvePromise(false)
    resolvePromise = null
  }
}

defineExpose({
  show
})
</script>

<style scoped>
/* Vue transition animations */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-active > div,
.dialog-leave-active > div {
  transition: transform 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from > div {
  transform: scale(0.9) translateY(-20px);
}

.dialog-leave-to > div {
  transform: scale(0.9) translateY(20px);
}
</style>
