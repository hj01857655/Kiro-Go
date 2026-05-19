<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">{{ t('auditLogs.title') }}</h2>
        <el-button-group>
          <el-button size="small" :disabled="loading || logs.length === 0" @click="exportLogs">
            <el-icon><Download /></el-icon>
            {{ t('auditLogs.exportLogs') }}
          </el-button>
          <el-button size="small" type="danger" :disabled="loading || logs.length === 0" @click="clearLogs">
            <el-icon><Delete /></el-icon>
            {{ t('auditLogs.clearLogs') }}
          </el-button>
        </el-button-group>
      </div>
    </template>

    <p style="margin-bottom: 16px; font-size: 14px; color: var(--el-text-color-secondary);">
      {{ t('auditLogs.description') }}
    </p>

    <!-- Filters -->
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="10">
          <el-input
            v-model="searchQuery"
            :placeholder="t('auditLogs.searchPlaceholder')"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="12" :sm="6" :md="7">
          <el-select v-model="filterAction" style="width: 100%;">
            <el-option value="all" :label="t('auditLogs.allActions')" />
            <el-option value="account.create" :label="t('auditLogs.accountCreate')" />
            <el-option value="account.update" :label="t('auditLogs.accountUpdate')" />
            <el-option value="account.delete" :label="t('auditLogs.accountDelete')" />
            <el-option value="apikey.create" :label="t('auditLogs.apikeyCreate')" />
            <el-option value="apikey.update" :label="t('auditLogs.apikeyUpdate')" />
            <el-option value="apikey.delete" :label="t('auditLogs.apikeyDelete')" />
            <el-option value="settings.update" :label="t('auditLogs.settingsUpdate')" />
            <el-option value="stats.reset" :label="t('auditLogs.statsReset')" />
          </el-select>
        </el-col>
        <el-col :xs="12" :sm="6" :md="7">
          <el-select v-model="filterTimeRange" style="width: 100%;">
            <el-option value="all" :label="t('auditLogs.allTime')" />
            <el-option value="today" :label="t('auditLogs.today')" />
            <el-option value="week" :label="t('auditLogs.lastWeek')" />
            <el-option value="month" :label="t('auditLogs.lastMonth')" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- Stats -->
    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :xs="8" :sm="8">
        <el-statistic :value="filteredLogs.length" :title="t('auditLogs.totalLogs')" />
      </el-col>
      <el-col :xs="8" :sm="8">
        <el-statistic :value="todayLogsCount" :title="t('auditLogs.todayLogs')" />
      </el-col>
      <el-col :xs="8" :sm="8">
        <el-statistic :value="lastActionTime" :title="t('auditLogs.lastAction')" />
      </el-col>
    </el-row>

    <!-- Loading -->
    <div v-if="loading">
      <el-skeleton :rows="5" animated style="margin-bottom: 16px;" />
      <el-skeleton :rows="5" animated />
    </div>

    <!-- Logs List -->
    <div v-else-if="filteredLogs.length > 0" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
      <el-card
        v-for="log in paginatedLogs"
        :key="log.id"
        shadow="hover"
        :body-style="{ padding: '16px' }"
      >
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="font-size: 24px; flex-shrink: 0;">{{ getActionIcon(log.action) }}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 15px;">{{ getActionLabel(log.action) }}</strong>
              <el-tag
                :type="log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'info'"
                size="small"
              >
                {{ log.level }}
              </el-tag>
            </div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ formatDateTime(log.timestamp) }}
            </div>
          </div>
          <el-button size="small" @click="toggleLogDetails(log.id)">
            {{ expandedLogs.has(log.id) ? t('common.collapse') : t('common.details') }}
          </el-button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--el-text-color-regular);">
          <span style="font-weight: 500;">{{ log.user || t('auditLogs.system') }}</span>
          <span style="color: var(--el-text-color-secondary);">•</span>
          <span>{{ log.message }}</span>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedLogs.has(log.id)" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--el-border-color);">
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item v-if="log.target" :label="t('auditLogs.target')">
              {{ log.target }}
            </el-descriptions-item>
            <el-descriptions-item v-if="log.ipAddress" :label="t('auditLogs.ipAddress')">
              {{ log.ipAddress }}
            </el-descriptions-item>
            <el-descriptions-item v-if="log.userAgent" :label="t('auditLogs.userAgent')">
              {{ log.userAgent }}
            </el-descriptions-item>
            <el-descriptions-item v-if="log.changes" :label="t('auditLogs.changes')">
              <pre style="margin: 0; padding: 8px; background: var(--el-fill-color-light); border-radius: 4px; font-size: 12px; overflow-x: auto;">{{ JSON.stringify(log.changes, null, 2) }}</pre>
            </el-descriptions-item>
            <el-descriptions-item v-if="log.metadata" :label="t('auditLogs.metadata')">
              <pre style="margin: 0; padding: 8px; background: var(--el-fill-color-light); border-radius: 4px; font-size: 12px; overflow-x: auto;">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>
    </div>

    <!-- Empty State -->
    <el-empty v-else :description="t('auditLogs.noLogs')" />

    <!-- Pagination -->
    <el-pagination
      v-if="filteredLogs.length > pageSize"
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="filteredLogs.length"
      layout="prev, pager, next"
      style="justify-content: center;"
    />
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { Download, Delete, Search } from '@element-plus/icons-vue'

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

    filtered = filtered.filter(log => {
      const logDate = typeof log.timestamp === 'number' ? new Date(log.timestamp * 1000) : new Date(log.timestamp)
      return logDate >= cutoff
    })
  }

  return filtered.sort((a, b) => {
    const dateA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() / 1000
    const dateB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() / 1000
    return dateB - dateA
  })
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredLogs.value.slice(start, end)
})

const todayLogsCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return logs.value.filter(log => {
    const logDate = typeof log.timestamp === 'number' ? new Date(log.timestamp * 1000) : new Date(log.timestamp)
    return logDate >= today
  }).length
})

const lastActionTime = computed(() => {
  if (logs.value.length === 0) return t('accounts.never')
  const latest = logs.value.reduce((a, b) => {
    const dateA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() / 1000
    const dateB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() / 1000
    return dateA > dateB ? a : b
  })
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
  const parts = action.split('.')
  const camelCase = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  return t(`auditLogs.${camelCase}`) || action
}

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return date.toLocaleString()
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const now = new Date()
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
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
