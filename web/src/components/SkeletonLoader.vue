<template>
  <div class="w-full">
    <!-- Account Card Skeleton -->
    <div v-if="type === 'account-card'" class="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 mb-3">
      <div class="flex items-center gap-3 mb-4">
        <div class="skeleton-shimmer w-12 h-12 rounded-full flex-shrink-0"></div>
        <div class="flex-1">
          <div class="skeleton-shimmer h-6 w-[70%] mb-2 rounded"></div>
          <div class="skeleton-shimmer h-4 w-[50%] rounded"></div>
        </div>
      </div>
      <div class="mb-4">
        <div class="skeleton-shimmer h-2 w-full rounded mb-3"></div>
        <div class="skeleton-shimmer h-5 w-[60%] rounded"></div>
      </div>
      <div class="flex gap-2">
        <div class="skeleton-shimmer h-6 w-15 rounded-xl"></div>
        <div class="skeleton-shimmer h-6 w-15 rounded-xl"></div>
      </div>
    </div>

    <!-- Stats Card Skeleton -->
    <div v-else-if="type === 'stats-card'" class="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 text-center">
      <div class="skeleton-shimmer h-8 w-[80%] mx-auto mb-2 rounded"></div>
      <div class="skeleton-shimmer h-4 w-[50%] mx-auto rounded"></div>
    </div>

    <!-- Details Section Skeleton -->
    <div v-else-if="type === 'details-section'" class="p-4">
      <div class="skeleton-shimmer h-6 w-[70%] mb-4 rounded"></div>
      <div v-for="i in rows" :key="i" class="flex gap-4 items-center mb-3">
        <div class="skeleton-shimmer h-4 w-[30%] rounded"></div>
        <div class="skeleton-shimmer h-5 w-[60%] rounded"></div>
      </div>
    </div>

    <!-- Table Row Skeleton -->
    <div v-else-if="type === 'table-row'" class="flex gap-4 p-3 border-b border-[var(--border-color)]">
      <div class="skeleton-shimmer h-5 w-[60%] rounded"></div>
      <div class="skeleton-shimmer h-4 w-[50%] rounded"></div>
      <div class="skeleton-shimmer h-4 w-[50%] rounded"></div>
    </div>

    <!-- Generic Block Skeleton -->
    <div v-else class="p-5 bg-[var(--bg-secondary)] rounded-xl">
      <div class="skeleton-shimmer h-6 w-[70%] mb-2 rounded"></div>
      <div class="skeleton-shimmer h-5 w-[60%] mb-1.5 rounded"></div>
      <div class="skeleton-shimmer h-4 w-[50%] rounded"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'block',
    validator: (value) => ['account-card', 'stats-card', 'details-section', 'table-row', 'block'].includes(value)
  },
  rows: {
    type: Number,
    default: 3
  }
})
</script>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 0%,
    var(--border-color) 50%,
    var(--bg-tertiary) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}
</style>
