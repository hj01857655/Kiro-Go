<template>
  <el-dialog
    :model-value="show"
    :title="t('accounts.accountDetailsTitle')"
    width="900px"
    @close="$emit('close')"
  >
    <el-scrollbar max-height="70vh">
      <div v-if="loading" style="display: flex; flex-direction: column; gap: 16px;">
        <el-skeleton :rows="6" animated />
        <el-skeleton :rows="5" animated />
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="details" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Basic Information -->
        <el-card shadow="never">
          <template #header>
            <strong>{{ t('accounts.basicInformation') }}</strong>
          </template>
          <el-descriptions :column="2" size="small">
            <el-descriptions-item :label="t('accounts.email')">{{ details.email }}</el-descriptions-item>
            <el-descriptions-item :label="t('accounts.userId')">
              <code style="font-size: 11px;">{{ details.userId || t('common.none') }}</code>
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.nickname')">{{ details.nickname || t('common.none') }}</el-descriptions-item>
            <el-descriptions-item :label="t('accounts.region')">{{ details.region || t('common.none') }}</el-descriptions-item>
            <el-descriptions-item :label="t('accounts.authMethod')">{{ getAuthMethodLabel(details.authMethod) }}</el-descriptions-item>
            <el-descriptions-item :label="t('accounts.status')">
              <el-tag :type="details.enabled ? 'success' : 'danger'" size="small">
                {{ details.enabled ? t('accounts.enabled') : t('accounts.disabled') }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Subscription Information -->
        <el-alert type="info" :closable="false">
          <template #title>
            <strong>{{ t('accounts.subscriptionInformation') }}</strong>
          </template>
          <el-descriptions :column="2" size="small">
            <el-descriptions-item :label="t('accounts.subscriptionType')">
              <el-tag :type="getTagType(details)" size="small">
                {{ details.subscriptionType || 'FREE' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.subscriptionTitle')">
              {{ details.subscriptionTitle || t('common.none') }}
            </el-descriptions-item>
            <el-descriptions-item v-if="accountSupportsOverage(details)" :label="t('accounts.overageCapability')" :span="2">
              <el-tag type="success" size="small">✓ {{ t('accounts.overageSupported') }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-alert>

        <!-- Quota Usage -->
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>{{ t('accounts.quotaUsage') }}</strong>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.resetDate') }}: {{ details.nextResetDate || t('common.unknown') }}
              </span>
            </div>
          </template>
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>{{ details.usageCurrent?.toFixed(1) || 0 }} / {{ details.usageLimit?.toFixed(1) || 0 }}</span>
              <span style="font-weight: 600;">{{ getUsagePercent(details).toFixed(1) }}%</span>
            </div>
            <el-progress
              :percentage="Math.min(100, getUsagePercent(details))"
              :status="getProgressStatus(details)"
            />
          </div>
          <el-descriptions :column="3" size="small">
            <el-descriptions-item :label="t('accounts.currentUsage')">
              {{ details.usageCurrent?.toFixed(2) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.usageLimit')">
              {{ details.usageLimit?.toFixed(2) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.remaining')">
              {{ Math.max(0, (details.usageLimit || 0) - (details.usageCurrent || 0)).toFixed(2) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Overage Control -->
        <el-card v-if="accountSupportsOverage(details)" shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>{{ t('accounts.overageControl') }}</strong>
              <el-button
                :type="accountOverageEnabled(details) ? 'warning' : 'success'"
                size="small"
                :loading="overageToggling"
                @click="handleToggleOverage"
              >
                {{ accountOverageEnabled(details) ? t('accounts.disableOverage') : t('accounts.enableOverage') }}
              </el-button>
            </div>
          </template>
          <el-descriptions v-if="accountOverageEnabled(details)" :column="2" size="small">
            <el-descriptions-item :label="t('accounts.currentOverages')">
              {{ details.currentOverages?.toFixed(2) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.overageCap')">
              {{ details.overageCap?.toFixed(2) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.overageRate')">
              {{ details.currency || 'USD' }} {{ details.overageRate?.toFixed(4) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.overageCharges')">
              <span style="color: var(--el-color-danger); font-weight: 600;">
                {{ details.currency || 'USD' }} {{ details.overageCharges?.toFixed(2) || 0 }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
          <el-empty v-else :description="t('accounts.overageDisabled')" :image-size="60" />
        </el-card>

        <!-- Models -->
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>{{ t('accounts.availableModels') }}</strong>
              <el-button size="small" :loading="refreshingModels" @click="handleRefreshModels">
                <el-icon><Refresh /></el-icon>
                {{ t('common.refresh') }}
              </el-button>
            </div>
          </template>
          <el-table :data="details.models || []" size="small" stripe>
            <el-table-column prop="name" :label="t('accounts.modelName')" />
            <el-table-column prop="displayName" :label="t('accounts.displayName')" />
            <el-table-column :label="t('accounts.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                  {{ row.enabled ? t('accounts.enabled') : t('accounts.disabled') }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Load Balancing -->
        <el-card shadow="never">
          <template #header>
            <strong>{{ t('accounts.loadBalancing') }}</strong>
          </template>
          <el-descriptions :column="2" size="small">
            <el-descriptions-item :label="t('accounts.weight')">{{ details.weight || 1 }}</el-descriptions-item>
            <el-descriptions-item :label="t('accounts.allowOverageUsage')">
              <el-tag :type="details.allowOverage ? 'success' : 'info'" size="small">
                {{ details.allowOverage ? t('common.yes') : t('common.no') }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="details.allowOverage" :label="t('accounts.overageWeight')">
              {{ details.overageWeight || 1 }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- Advanced Information -->
        <el-card shadow="never">
          <template #header>
            <strong>{{ t('accounts.advancedInformation') }}</strong>
          </template>
          <el-descriptions :column="1" size="small">
            <el-descriptions-item :label="t('accounts.proxyURL')">
              {{ details.proxyURL || t('common.none') }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.machineId')">
              <code style="font-size: 11px;">{{ details.machineId || t('common.none') }}</code>
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.lastRefresh')">
              {{ details.lastRefresh ? new Date(details.lastRefresh * 1000).toLocaleString() : t('common.never') }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.lastUsed')">
              {{ details.lastUsed ? new Date(details.lastUsed * 1000).toLocaleString() : t('common.never') }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('accounts.requestCount')">
              {{ details.requestCount || 0 }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
    </el-scrollbar>

    <template #footer>
      <el-button @click="$emit('close')">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useAccountUtils } from '../../composables/useAccountUtils'

const props = defineProps({
  show: { type: Boolean, required: true },
  accountId: { type: String, default: null },
  password: { type: String, required: true }
})

const emit = defineEmits(['close', 'overage-toggled'])

const { t } = inject('i18n')
const toast = inject('toast')

const {
  getUsagePercent,
  getAuthMethodLabel,
  accountSupportsOverage,
  accountOverageEnabled
} = useAccountUtils()

const loading = ref(false)
const details = ref(null)
const overageToggling = ref(false)
const refreshingModels = ref(false)

function getTagType(account) {
  const type = account.subscriptionType?.toUpperCase()
  if (type === 'PRO' || type === 'PRO_PLUS') return 'primary'
  if (type === 'POWER') return 'warning'
  return 'info'
}

function getProgressStatus(account) {
  const percent = getUsagePercent(account)
  if (percent >= 90) return 'exception'
  if (percent >= 70) return 'warning'
  return 'success'
}

watch(() => props.accountId, async (newId) => {
  if (newId && props.show) {
    await loadDetails()
  }
}, { immediate: true })

async function loadDetails() {
  if (!props.accountId) return

  loading.value = true
  try {
    const response = await fetch(`/api/accounts/${props.accountId}`, {
      headers: { 'X-Admin-Password': props.password }
    })

    if (!response.ok) {
      throw new Error('Failed to load account details')
    }

    details.value = await response.json()
  } catch (error) {
    console.error('Load details error:', error)
    toast.error(error.message || 'Failed to load account details')
  } finally {
    loading.value = false
  }
}

async function handleToggleOverage() {
  overageToggling.value = true
  try {
    const response = await fetch(`/api/accounts/${props.accountId}/overage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify({
        enabled: !accountOverageEnabled(details.value)
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to toggle overage')
    }

    details.value = { ...details.value, ...result }
    toast.success(accountOverageEnabled(details.value) ? 'Overage enabled' : 'Overage disabled')
    emit('overage-toggled', result)
  } catch (error) {
    console.error('Toggle overage error:', error)
    toast.error(error.message || 'Failed to toggle overage')
  } finally {
    overageToggling.value = false
  }
}

async function handleRefreshModels() {
  refreshingModels.value = true
  try {
    const response = await fetch(`/api/accounts/${props.accountId}/models/refresh`, {
      method: 'POST',
      headers: { 'X-Admin-Password': props.password }
    })

    if (!response.ok) {
      throw new Error('Failed to refresh models')
    }

    await loadDetails()
    toast.success('Models refreshed successfully')
  } catch (error) {
    console.error('Refresh models error:', error)
    toast.error(error.message || 'Failed to refresh models')
  } finally {
    refreshingModels.value = false
  }
}
</script>
