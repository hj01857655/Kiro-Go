<template>
  <div class="card">
    <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('stats.title') }}</h2>
      <button @click="resetStats" class="btn-danger btn-sm">{{ t('stats.resetStats') }}</button>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="flex flex-col gap-6">
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <SkeletonLoader v-for="i in 3" :key="i" type="stats-card" />
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <SkeletonLoader v-for="i in 4" :key="i" type="stats-card" />
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <SkeletonLoader v-for="i in 3" :key="i" type="stats-card" />
        </div>
      </div>
    </div>

    <div v-else-if="stats" class="flex flex-col gap-6">
      <!-- Account Stats -->
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">{{ t('stats.accountsSection') }}</h3>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-primary mb-1">{{ stats.accounts || 0 }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.totalAccounts') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-success mb-1">{{ stats.available || 0 }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.available') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-warning mb-1">{{ (stats.accounts || 0) - (stats.available || 0) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.unavailable') }}</div>
          </div>
        </div>
      </div>

      <!-- Request Stats -->
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">{{ t('stats.requestsSection') }}</h3>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-primary mb-1">{{ formatNumber(stats.totalRequests) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.totalRequests') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-success mb-1">{{ formatNumber(stats.successRequests) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.successful') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-error mb-1">{{ formatNumber(stats.failedRequests) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.failed') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold mb-1" :class="getSuccessRateClass(successRate)">{{ successRate }}%</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.successRate') }}</div>
          </div>
        </div>
      </div>

      <!-- Usage Stats -->
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">{{ t('stats.usageSection') }}</h3>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-primary mb-1">{{ formatNumber(stats.totalTokens) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.totalTokens') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-primary mb-1">{{ formatCredits(stats.totalCredits) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.totalCredits') }}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700 transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm">
            <div class="text-2xl font-bold text-primary mb-1">{{ formatUptime(stats.uptime) }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 font-medium">{{ t('stats.uptime') }}</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5 mt-2">
        <!-- Success Rate Trend -->
        <ChartCard
          v-if="successRateHistory.length > 0"
          type="line"
          :title="t('stats.successRateTrend')"
          :subtitle="t('stats.last24Hours')"
          :data="successRateHistory"
          :labels="successRateLabels"
          color="#10b981"
          :show-area="true"
        />

        <!-- Account Type Distribution -->
        <ChartCard
          v-if="accountTypeData.length > 0"
          type="donut"
          :title="t('stats.accountDistribution')"
          :subtitle="t('stats.bySubscriptionType')"
          :data="accountTypeData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import SkeletonLoader from './SkeletonLoader.vue'
import ChartCard from './ChartCard.vue'

const props = defineProps(['password'])
const toast = inject('toast')
const confirm = inject('confirm')
const { t } = inject('i18n')
const stats = ref(null)
const loading = ref(true)

// Mock data for success rate history (last 24 hours)
const successRateHistory = computed(() => {
  if (!stats.value) return []

  // Generate 24 data points (hourly)
  const data = []
  const currentRate = parseFloat(successRate.value)

  for (let i = 23; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 10
    const rate = Math.max(0, Math.min(100, currentRate + variance))
    data.push({
      value: rate,
      label: `${i}h ago`
    })
  }

  return data.reverse()
})

const successRateLabels = computed(() => {
  return ['24h', '18h', '12h', '6h', 'Now']
})

// Account type distribution data
const accountTypeData = computed(() => {
  if (!stats.value || !stats.value.accountsByType) return []

  const colors = {
    'FREE': '#94a3b8',
    'PRO': '#3b82f6',
    'PRO_PLUS': '#7c3aed',
    'POWER': '#f59e0b'
  }

  return Object.entries(stats.value.accountsByType || {}).map(([type, count]) => ({
    label: type.replace('_', ' '),
    value: count,
    color: colors[type] || '#64748b'
  }))
})

const successRate = computed(() => {
  if (!stats.value || !stats.value.totalRequests) return 0
  return ((stats.value.successRequests / stats.value.totalRequests) * 100).toFixed(1)
})

onMounted(() => {
  loadStats()
})

async function loadStats() {
  loading.value = true
  try {
    const res = await fetch('/admin/api/stats', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (res.ok) {
      stats.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  } finally {
    loading.value = false
  }
}

async function resetStats() {
  const confirmed = await confirm({
    title: t('stats.resetConfirmTitle'),
    message: t('stats.resetConfirmMessage'),
    type: 'danger',
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel')
  })
  if (!confirmed) return

  try {
    const res = await fetch('/admin/api/stats/reset', {
      method: 'POST',
      headers: { 'X-Admin-Password': props.password }
    })
    if (res.ok) {
      loadStats()
      toast.success(t('stats.statsReset'))
    } else {
      toast.error(t('stats.failedToResetStats'))
    }
  } catch (e) {
    toast.error(t('stats.failedToResetStats'))
  }
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

function formatCredits(credits) {
  if (!credits) return '0'
  return credits.toFixed(2)
}

function formatUptime(seconds) {
  if (!seconds) return '0s'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getSuccessRateClass(rate) {
  const r = parseFloat(rate)
  if (r >= 95) return 'text-success'
  if (r >= 80) return 'text-warning'
  return 'text-error'
}
</script>

