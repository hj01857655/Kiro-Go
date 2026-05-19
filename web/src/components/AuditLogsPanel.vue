<template>
  <div class="card">
    <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('auditLogs.title') }}</h2>
      <div class="flex gap-2">
        <button @click="exportLogs" class="btn-secondary btn-sm" :disabled="loading || logs.length === 0">
          📥 {{ t('auditLogs.exportLogs') }}
        </button>
        <button @click="clearLogs" class="btn-danger btn-sm" :disabled="loading || logs.length === 0">
          🗑️ {{ t('auditLogs.clearLogs') }}
        </button>
      </div>
    </div>

    <div class="mb-5">
      <p class="text-gray-600 dark:text-gray-400 text-sm">{{ t('auditLogs.description') }}</p>
    </div>

    <!-- Filters -->
    <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
      <div class="flex gap-3 items-center">
        <div class="flex-1 max-w-[400px] relative">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</div>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('auditLogs.searchPlaceholder')"
            class="input pl-9"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            name="audit-search"
            data-lpignore="true"
            data-form-type="other"
          >
        </div>
        <select v-model="filterAction" class="input w-[160px]">
          <option value="all">📝 {{ t('auditLogs.allActions') }}</option>
          <option value="account.create">{{ t('auditLogs.accountCreate') }}</option>
          <option value="account.update">{{ t('auditLogs.accountUpdate') }}</option>
          <option value="account.delete">{{ t('auditLogs.accountDelete') }}</option>
          <option value="apikey.create">{{ t('auditLogs.apikeyCreate') }}</option>
          <option value="apikey.update">{{ t('auditLogs.apikeyUpdate') }}</option>
          <option value="apikey.delete">{{ t('auditLogs.apikeyDelete') }}</option>
          <option value="settings.update">{{ t('auditLogs.settingsUpdate') }}</option>
          <option value="stats.reset">{{ t('auditLogs.statsReset') }}</option>
        </select>
        <select v-model="filterTimeRange" class="input w-[140px]">
          <option value="all">📅 {{ t('auditLogs.allTime') }}</option>
          <option value="today">{{ t('auditLogs.today') }}</option>
          <option value="week">{{ t('auditLogs.lastWeek') }}</option>
          <option value="month">{{ t('auditLogs.lastMonth') }}</option>
        </select>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="flex gap-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex-wrap">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-gray-600 dark:text-gray-400 uppercase font-medium">{{ t('auditLogs.totalLogs') }}</span>
        <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ filteredLogs.length }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-gray-600 dark:text-gray-400 uppercase font-medium">{{ t('auditLogs.todayLogs') }}</span>
        <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ todayLogsCount }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-gray-600 dark:text-gray-400 uppercase font-medium">{{ t('auditLogs.lastAction') }}</span>
        <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ lastActionTime }}</span>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="flex flex-col gap-3 mb-5">
      <SkeletonLoader v-for="i in 5" :key="i" type="table-row" />
    </div>

    <!-- Logs List -->
    <div v-else-if="filteredLogs.length > 0" class="flex flex-col gap-3 mb-5">
      <div v-for="log in paginatedLogs" :key="log.id" class="log-card" :class="[
        log.level === 'error' && 'border-l-error',
        log.level === 'warning' && 'border-l-warning',
        log.level === 'info' && 'border-l-info'
      ]">
        <div class="flex items-center gap-3 mb-2">
          <div class="text-2xl flex-shrink-0">{{ getActionIcon(log.action) }}</div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <strong class="text-gray-900 dark:text-gray-100 text-[15px]">{{ getActionLabel(log.action) }}</strong>
              <span class="log-level" :class="[
                log.level === 'info' && 'bg-info text-white',
                log.level === 'warning' && 'bg-warning text-white',
                log.level === 'error' && 'bg-error text-white'
              ]">{{ log.level }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-500">{{ formatDateTime(log.timestamp) }}</div>
          </div>
          <button @click="toggleLogDetails(log.id)" class="btn-secondary btn-sm">
            {{ expandedLogs.has(log.id) ? t('common.collapse') : t('common.details') }}
          </button>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span class="font-medium text-gray-900 dark:text-gray-100">{{ log.user || t('auditLogs.system') }}</span>
          <span class="text-gray-500 dark:text-gray-500">•</span>
          <span>{{ log.message }}</span>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedLogs.has(log.id)" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
          <div v-if="log.target" class="flex gap-2 text-[13px]">
            <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ t('auditLogs.target') }}:</span>
            <span class="text-gray-900 dark:text-gray-100 break-all">{{ log.target }}</span>
          </div>
          <div v-if="log.ipAddress" class="flex gap-2 text-[13px]">
            <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ t('auditLogs.ipAddress') }}:</span>
            <span class="text-gray-900 dark:text-gray-100 break-all">{{ log.ipAddress }}</span>
          </div>
          <div v-if="log.userAgent" class="flex gap-2 text-[13px]">
            <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ t('auditLogs.userAgent') }}:</span>
            <span class="text-gray-900 dark:text-gray-100 break-all">{{ log.userAgent }}</span>
          </div>
          <div v-if="log.changes" class="flex gap-2 text-[13px]">
            <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ t('auditLogs.changes') }}:</span>
            <pre class="flex-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">{{ JSON.stringify(log.changes, null, 2) }}</pre>
          </div>
          <div v-if="log.metadata" class="flex gap-2 text-[13px]">
            <span class="font-medium text-gray-600 dark:text-gray-400 min-w-[100px]">{{ t('auditLogs.metadata') }}:</span>
            <pre class="flex-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-15">
      <div class="text-5xl mb-4">📋</div>
      <p class="text-gray-600 dark:text-gray-400">{{ t('auditLogs.noLogs') }}</p>
    </div>

    <!-- Pagination -->
    <div v-if="filteredLogs.length > pageSize" class="flex justify-center items-center gap-4 p-4">
      <button
        @click="currentPage--"
        class="btn-secondary btn-sm"
        :disabled="currentPage === 1"
      >
        {{ t('auditLogs.previous') }}
      </button>
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ t('auditLogs.pageInfo', { current: currentPage, total: totalPages }) }}
      </span>
      <button
        @click="currentPage++"
        class="btn-secondary btn-sm"
        :disabled="currentPage === totalPages"
      >
        {{ t('auditLogs.next') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import SkeletonLoader from './SkeletonLoader.vue'

const props = defineProps(['password'])
const toast = inject('toast')
const confirm = inject('confirm')
const { t } = inject('i18n')

const logs = ref([])
const loading = ref(true)
const searchQuery = ref('')
const filterAction = ref('all')
const filterTimeRange = ref('all')
const expandedLogs = ref(new Set())
const currentPage = ref(1)
const pageSize = 20

// Computed properties
const filteredLogs = computed(() => {
  let filtered = logs.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.user?.toLowerCase().includes(query) ||
      log.target?.toLowerCase().includes(query)
    )
  }

  // Action filter
  if (filterAction.value !== 'all') {
    filtered = filtered.filter(log => log.action === filterAction.value)
  }

  // Time range filter
  if (filterTimeRange.value !== 'all') {
    const now = new Date()
    const cutoff = new Date()

    switch (filterTimeRange.value) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0)
        break
      case 'week':
        cutoff.setDate(now.getDate() - 7)
        break
      case 'month':
        cutoff.setMonth(now.getMonth() - 1)
        break
    }

    filtered = filtered.filter(log => new Date(log.timestamp) >= cutoff)
  }

  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredLogs.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / pageSize)
})

const todayLogsCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return logs.value.filter(log => new Date(log.timestamp) >= today).length
})

const lastActionTime = computed(() => {
  if (logs.value.length === 0) return t('accounts.never')
  const latest = logs.value.reduce((a, b) =>
    new Date(a.timestamp) > new Date(b.timestamp) ? a : b
  )
  return formatRelativeTime(latest.timestamp)
})

onMounted(() => {
  loadLogs()
})

async function loadLogs() {
  loading.value = true
  try {
    const res = await fetch('/admin/api/audit-logs', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (res.ok) {
      logs.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load audit logs:', e)
  } finally {
    loading.value = false
  }
}

async function clearLogs() {
  const confirmed = await confirm({
    title: t('auditLogs.clearConfirmTitle'),
    message: t('auditLogs.clearConfirmMessage'),
    type: 'danger',
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel')
  })

  if (!confirmed) return

  try {
    const res = await fetch('/admin/api/audit-logs', {
      method: 'DELETE',
      headers: { 'X-Admin-Password': props.password }
    })

    if (res.ok) {
      toast.success(t('auditLogs.logsCleared'))
      loadLogs()
    }
  } catch (e) {
    toast.error(t('auditLogs.failedToClearLogs'))
  }
}

function exportLogs() {
  const data = filteredLogs.value.map(log => ({
    timestamp: log.timestamp,
    action: log.action,
    level: log.level,
    user: log.user || 'system',
    message: log.message,
    target: log.target,
    ipAddress: log.ipAddress,
    changes: log.changes,
    metadata: log.metadata
  }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  toast.success(t('auditLogs.logsExported'))
}

function toggleLogDetails(logId) {
  if (expandedLogs.value.has(logId)) {
    expandedLogs.value.delete(logId)
  } else {
    expandedLogs.value.add(logId)
  }
}

function getActionIcon(action) {
  const icons = {
    'account.create': '➕',
    'account.update': '✏️',
    'account.delete': '🗑️',
    'apikey.create': '🔑',
    'apikey.update': '🔧',
    'apikey.delete': '❌',
    'settings.update': '⚙️',
    'stats.reset': '🔄'
  }
  return icons[action] || '📝'
}

function getActionLabel(action) {
  // Convert 'account.create' to 'accountCreate'
  const key = action.replace(/\./g, '').replace(/([a-z])([A-Z])/g, '$1$2')
  const parts = action.split('.')
  const camelCase = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  return t(`auditLogs.${camelCase}`) || action
}

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}
</script>

<style scoped>
.log-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  border-left-width: 4px;
}

.log-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.log-level {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
