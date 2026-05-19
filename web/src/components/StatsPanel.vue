<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">{{ t('stats.title') }}</h2>
        <el-button type="danger" size="small" @click="resetStats">
          {{ t('stats.resetStats') }}
        </el-button>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading">
      <el-skeleton :rows="6" animated style="margin-bottom: 24px;" />
      <el-skeleton :rows="6" animated style="margin-bottom: 24px;" />
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="stats" style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Account Stats -->
      <el-card shadow="never">
        <template #header>
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; color: var(--el-text-color-secondary);">
            {{ t('stats.accountsSection') }}
          </h3>
        </template>
        <el-row :gutter="16">
          <el-col :xs="8" :sm="8">
            <el-statistic :value="stats.accounts || 0" :title="t('stats.totalAccounts')">
              <template #prefix>
                <el-icon color="#409EFF"><Document /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="8" :sm="8">
            <el-statistic :value="stats.available || 0" :title="t('stats.available')">
              <template #prefix>
                <el-icon color="#67C23A"><CircleCheck /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="8" :sm="8">
            <el-statistic :value="(stats.accounts || 0) - (stats.available || 0)" :title="t('stats.unavailable')">
              <template #prefix>
                <el-icon color="#E6A23C"><WarningFilled /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- Request Stats -->
      <el-card shadow="never">
        <template #header>
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; color: var(--el-text-color-secondary);">
            {{ t('stats.requestsSection') }}
          </h3>
        </template>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <el-statistic :value="formatNumber(stats.totalRequests)" :title="t('stats.totalRequests')">
              <template #prefix>
                <el-icon color="#409EFF"><DataLine /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic :value="formatNumber(stats.successRequests)" :title="t('stats.successful')">
              <template #prefix>
                <el-icon color="#67C23A"><Select /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic :value="formatNumber(stats.failedRequests)" :title="t('stats.failed')">
              <template #prefix>
                <el-icon color="#F56C6C"><CircleClose /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-statistic :value="successRate + '%'" :title="t('stats.successRate')">
              <template #prefix>
                <el-icon :color="getSuccessRateColor(successRate)"><TrendCharts /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- Usage Stats -->
      <el-card shadow="never">
        <template #header>
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; color: var(--el-text-color-secondary);">
            {{ t('stats.usageSection') }}
          </h3>
        </template>
        <el-row :gutter="16">
          <el-col :xs="8" :sm="8">
            <el-statistic :value="formatNumber(stats.totalTokens)" :title="t('stats.totalTokens')">
              <template #prefix>
                <el-icon color="#409EFF"><Coin /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="8" :sm="8">
            <el-statistic :value="formatCredits(stats.totalCredits)" :title="t('stats.totalCredits')">
              <template #prefix>
                <el-icon color="#409EFF"><Money /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="8" :sm="8">
            <el-statistic :value="formatUptime(stats.uptime)" :title="t('stats.uptime')">
              <template #prefix>
                <el-icon color="#409EFF"><Timer /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- Charts (if ChartCard component exists) -->
      <el-row v-if="false" :gutter="20">
        <el-col :xs="24" :sm="12">
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
        </el-col>
        <el-col :xs="24" :sm="12">
          <ChartCard
            v-if="accountTypeData.length > 0"
            type="donut"
            :title="t('stats.accountDistribution')"
            :subtitle="t('stats.bySubscriptionType')"
            :data="accountTypeData"
          />
        </el-col>
      </el-row>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import {
  Document,
  CircleCheck,
  WarningFilled,
  DataLine,
  Select,
  CircleClose,
  TrendCharts,
  Coin,
  Money,
  Timer
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const props = defineProps(['password'])
const toast = inject('toast')
const { t } = inject('i18n')
const stats = ref(null)
const loading = ref(true)

const successRate = computed(() => {
  if (!stats.value || !stats.value.totalRequests) return 0
  return ((stats.value.successRequests / stats.value.totalRequests) * 100).toFixed(1)
})

const successRateHistory = computed(() => {
  if (!stats.value) return []
  const data = []
  const currentRate = parseFloat(successRate.value)
  for (let i = 23; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 10
    const rate = Math.max(0, Math.min(100, currentRate + variance))
    data.push({ value: rate, label: `${i}h ago` })
  }
  return data.reverse()
})

const successRateLabels = computed(() => {
  return ['24h', '18h', '12h', '6h', 'Now']
})

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
  try {
    await ElMessageBox.confirm(
      t('stats.resetConfirmMessage'),
      t('stats.resetConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

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
    if (e !== 'cancel') {
      toast.error(t('stats.failedToResetStats'))
    }
  }
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
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

function getSuccessRateColor(rate) {
  const r = parseFloat(rate)
  if (r >= 95) return '#67C23A'
  if (r >= 80) return '#E6A23C'
  return '#F56C6C'
}
</script>
