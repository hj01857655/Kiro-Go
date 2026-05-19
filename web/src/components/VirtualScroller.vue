<template>
  <div class="h-full overflow-y-auto overflow-x-hidden relative scroll-smooth virtual-scroller" ref="scrollerRef" @scroll="handleScroll">
    <div class="relative w-full" :style="{ height: `${totalHeight}px` }">
      <div class="absolute top-0 left-0 right-0 will-change-transform" :style="{ transform: `translateY(${offsetY}px)` }">
        <slot
          v-for="item in visibleItems"
          :key="getItemKey(item)"
          :item="item"
          :index="item.__index"
        ></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 150
  },
  buffer: {
    type: Number,
    default: 5
  },
  keyField: {
    type: String,
    default: 'id'
  }
})

const scrollerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// Total height of all items
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

// Calculate visible range
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)

  // Add buffer items above and below
  const startWithBuffer = Math.max(0, start - props.buffer)
  const endWithBuffer = Math.min(
    props.items.length,
    start + visibleCount + props.buffer
  )

  return {
    start: startWithBuffer,
    end: endWithBuffer
  }
})

// Visible items with index
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, idx) => ({
    ...item,
    __index: start + idx
  }))
})

// Offset for positioning visible items
const offsetY = computed(() => {
  return visibleRange.value.start * props.itemHeight
})

function handleScroll(event) {
  scrollTop.value = event.target.scrollTop
}

function getItemKey(item) {
  return item[props.keyField] || item.__index
}

function updateContainerHeight() {
  if (scrollerRef.value) {
    containerHeight.value = scrollerRef.value.clientHeight
  }
}

// Scroll to specific index
function scrollToIndex(index) {
  if (scrollerRef.value) {
    const targetScrollTop = index * props.itemHeight
    scrollerRef.value.scrollTop = targetScrollTop
  }
}

// Scroll to top
function scrollToTop() {
  if (scrollerRef.value) {
    scrollerRef.value.scrollTop = 0
  }
}

// Watch items changes and reset scroll if needed
watch(() => props.items.length, (newLength, oldLength) => {
  if (newLength < oldLength && scrollTop.value > totalHeight.value) {
    scrollToTop()
  }
})

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

defineExpose({
  scrollToIndex,
  scrollToTop
})
</script>

<style scoped>
/* Custom scrollbar */
.virtual-scroller::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroller::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.virtual-scroller::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background 0.2s;
}

.virtual-scroller::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
