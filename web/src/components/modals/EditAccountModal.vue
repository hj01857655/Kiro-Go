<template>
  <el-dialog
    :model-value="show && !!account"
    :title="t('accounts.editAccountTitle')"
    width="800px"
    @close="$emit('close')"
  >
    <el-scrollbar max-height="70vh">
      <!-- Subscription Information -->
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <strong>{{ t('accounts.subscriptionInformation') }}</strong>
        </template>
        <el-descriptions :column="2" size="small">
          <el-descriptions-item :label="t('accounts.subscriptionType')">
            {{ editForm.subscriptionType || 'FREE' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.subscriptionTitle')">
            {{ editForm.subscriptionTitle || 'N/A' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.overageCapability')" :span="2">
            <el-tag :type="accountSupportsOverage(editForm) ? 'success' : 'info'" size="small">
              {{ accountSupportsOverage(editForm) ? '✓ ' + t('accounts.overageSupported') : '✗ ' + t('common.notSupported') }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-alert>

      <!-- Quota Usage -->
      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <strong>{{ t('accounts.quotaUsage') }}</strong>
        </template>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>{{ t('accounts.usage') }}</span>
            <span style="font-weight: 600;">
              {{ editForm.usageCurrent?.toFixed(1) || 0 }} / {{ editForm.usageLimit?.toFixed(1) || 0 }}
              ({{ getUsagePercent(editForm).toFixed(1) }}%)
            </span>
          </div>
          <el-progress
            :percentage="Math.min(100, getUsagePercent(editForm))"
            :status="getProgressStatus(editForm)"
          />
        </div>
        <el-descriptions :column="2" size="small">
          <el-descriptions-item :label="t('accounts.remaining')">
            {{ Math.max(0, (editForm.usageLimit || 0) - (editForm.usageCurrent || 0)).toFixed(1) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.resetDate')">
            {{ editForm.nextResetDate || 'N/A' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Overage Control -->
      <el-card v-if="accountSupportsOverage(editForm)" shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <strong>{{ t('accounts.overageControl') }}</strong>
        </template>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">{{ t('accounts.overageEnabled') }}</div>
            <div style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ accountOverageEnabled(editForm) ? t('accounts.overageDisabledWarning') : t('accounts.confirmEnableOverage') }}
            </div>
          </div>
          <el-button
            :type="accountOverageEnabled(editForm) ? 'warning' : 'success'"
            :loading="overageToggling"
            @click="handleToggleOverage"
          >
            {{ accountOverageEnabled(editForm) ? t('accounts.disableOverage') : t('accounts.enableOverage') }}
          </el-button>
        </div>
        <el-descriptions v-if="accountOverageEnabled(editForm) && editForm.currentOverages > 0" :column="2" size="small">
          <el-descriptions-item :label="t('accounts.currentOverages')">
            {{ editForm.currentOverages?.toFixed(1) || 0 }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.overageCap')">
            {{ editForm.overageCap?.toFixed(1) || 0 }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.overageRate')">
            {{ editForm.currency || 'USD' }} {{ editForm.overageRate?.toFixed(4) || 0 }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('accounts.overageCharges')">
            <span style="color: var(--el-color-danger);">
              {{ editForm.currency || 'USD' }} {{ editForm.overageCharges?.toFixed(2) || 0 }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Basic Settings -->
      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <strong>{{ t('accounts.basicSettings') }}</strong>
        </template>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.nickname')">
            <el-input v-model="editForm.nickname" :placeholder="t('accounts.enterNickname')" />
          </el-form-item>
          <el-form-item :label="t('accounts.email')">
            <el-input v-model="editForm.email" :placeholder="t('accounts.enterEmail')" disabled />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Token Settings -->
      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <strong>{{ t('accounts.tokenSettings') }}</strong>
        </template>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.accessToken')">
            <el-input v-model="editForm.accessToken" :placeholder="t('accounts.enterNewAccessToken')" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item :label="t('accounts.refreshToken')">
            <el-input v-model="editForm.refreshToken" :placeholder="t('accounts.enterNewRefreshToken')" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Load Balancing -->
      <el-card shadow="never" style="margin-bottom: 16px;">
        <template #header>
          <strong>{{ t('accounts.loadBalancing') }}</strong>
        </template>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.weightLoadBalancing')">
            <el-input-number v-model="editForm.weight" :min="1" :max="100" style="width: 100%;" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.weightHelp') }}
              </span>
            </template>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="editForm.allowOverage">
              {{ t('accounts.allowOverageUsage') }}
            </el-checkbox>
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.allowOverageHelp') }}
              </span>
            </template>
          </el-form-item>
          <el-form-item v-if="editForm.allowOverage" :label="t('accounts.overageWeightLabel')">
            <el-input-number v-model="editForm.overageWeight" :min="1" :max="10" style="width: 100%;" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.overageWeightHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Advanced Settings -->
      <el-card shadow="never">
        <template #header>
          <strong>{{ t('accounts.advancedSettings') }}</strong>
        </template>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.proxyURLOptional')">
            <el-input v-model="editForm.proxyURL" :placeholder="t('settings.proxyURLPlaceholder')" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.proxyURLHelp') }}
              </span>
            </template>
          </el-form-item>
          <el-form-item :label="t('accounts.machineIdLabel')">
            <el-input v-model="editForm.machineId" :placeholder="t('accounts.enterMachineId')" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.machineIdHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </el-card>
    </el-scrollbar>

    <template #footer>
      <el-button @click="$emit('close')">{{ t('accounts.cancel') }}</el-button>
      <el-button type="primary" @click="handleSave">{{ t('accounts.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { useAccountUtils } from '../../composables/useAccountUtils'

const props = defineProps({
  show: { type: Boolean, required: true },
  account: { type: Object, default: null },
  password: { type: String, required: true }
})

const emit = defineEmits(['close', 'saved', 'overage-toggled'])

const { t } = inject('i18n')
const toast = inject('toast')

const {
  getUsagePercent,
  getUsageColorClass,
  getUsageProgressClass,
  accountSupportsOverage,
  accountOverageEnabled
} = useAccountUtils()

const editForm = ref({})
const overageToggling = ref(false)

function getProgressStatus(account) {
  const percent = getUsagePercent(account)
  if (percent >= 90) return 'exception'
  if (percent >= 70) return 'warning'
  return 'success'
}

watch(() => props.account, (newAccount) => {
  if (newAccount) {
    editForm.value = { ...newAccount }
  }
}, { immediate: true })

async function handleToggleOverage() {
  overageToggling.value = true
  try {
    const response = await fetch(`/api/accounts/${editForm.value.id}/overage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify({
        enabled: !accountOverageEnabled(editForm.value)
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to toggle overage')
    }

    editForm.value = { ...editForm.value, ...result }
    toast.success(accountOverageEnabled(editForm.value) ? 'Overage enabled' : 'Overage disabled')
    emit('overage-toggled', result)
  } catch (error) {
    console.error('Toggle overage error:', error)
    toast.error(error.message || 'Failed to toggle overage')
  } finally {
    overageToggling.value = false
  }
}

async function handleSave() {
  try {
    const response = await fetch(`/api/accounts/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(editForm.value)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update account')
    }

    toast.success('Account updated successfully')
    emit('saved', result)
    emit('close')
  } catch (error) {
    console.error('Save account error:', error)
    toast.error(error.message || 'Failed to update account')
  }
}
</script>
