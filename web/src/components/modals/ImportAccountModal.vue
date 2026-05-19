<template>
  <el-dialog
    :model-value="show"
    :title="t('accounts.importAccountsTitle')"
    width="600px"
    @close="$emit('close')"
  >
    <el-tabs v-model="importMethod">
      <el-tab-pane :label="t('accounts.ssoTokenTab')" name="sso">
        <el-form label-position="top">
          <el-form-item :label="t('accounts.region')">
            <el-select v-model="importData.region" style="width: 100%;">
              <el-option value="us-east-1" label="US East 1" />
              <el-option value="us-west-2" label="US West 2" />
              <el-option value="eu-west-1" label="EU West 1" />
              <el-option value="ap-southeast-1" label="AP Southeast 1" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('accounts.ssoTokensLabel')">
            <el-input
              v-model="importData.ssoTokens"
              type="textarea"
              :rows="8"
              :placeholder="t('accounts.ssoTokensPlaceholder')"
            />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.ssoTokensHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane :label="t('accounts.credentialsJsonTab')" name="credentials">
        <el-form label-position="top">
          <el-form-item :label="t('accounts.credentialsJsonLabel')">
            <el-input
              v-model="importData.credentialsJson"
              type="textarea"
              :rows="12"
              :placeholder="t('accounts.credentialsJsonPlaceholder')"
            />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.credentialsJsonHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- Import Results -->
    <el-alert
      v-if="importResults"
      type="info"
      :closable="false"
      style="margin-top: 16px;"
    >
      <template #title>
        <div style="display: flex; gap: 16px;">
          <span style="color: #67C23A; font-weight: 600;">
            ✓ {{ importResults.imported?.length || 0 }} {{ t('accounts.imported') }}
          </span>
          <span v-if="importResults.errors?.length" style="color: #F56C6C; font-weight: 600;">
            ✗ {{ importResults.errors.length }} {{ t('accounts.failed') }}
          </span>
        </div>
      </template>
      <div v-if="importResults.errors?.length" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
        <el-alert
          v-for="(err, idx) in importResults.errors"
          :key="idx"
          type="error"
          :closable="false"
          :title="err"
        />
      </div>
    </el-alert>

    <template #footer>
      <el-button @click="$emit('close')">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="importing" @click="handleImport">
        {{ importing ? t('accounts.importing') : t('common.import') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, inject } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  password: { type: String, required: true }
})

const emit = defineEmits(['close', 'imported'])

const { t } = inject('i18n')
const toast = inject('toast')

const importMethod = ref('sso')
const importing = ref(false)
const importResults = ref(null)
const importData = ref({
  region: 'us-east-1',
  ssoTokens: '',
  credentialsJson: ''
})

async function handleImport() {
  importing.value = true
  importResults.value = null

  try {
    const payload = {
      method: importMethod.value,
      region: importData.value.region
    }

    if (importMethod.value === 'sso') {
      payload.ssoTokens = importData.value.ssoTokens
    } else {
      payload.credentialsJson = importData.value.credentialsJson
    }

    const response = await fetch('/api/accounts/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Import failed')
    }

    importResults.value = result
    toast.success(`Successfully imported ${result.imported?.length || 0} account(s)`)

    if (result.imported?.length > 0) {
      emit('imported')
    }

    // Reset form if successful
    if (!result.errors?.length) {
      importData.value = {
        region: 'us-east-1',
        ssoTokens: '',
        credentialsJson: ''
      }
    }
  } catch (error) {
    console.error('Import error:', error)
    toast.error(error.message || 'Failed to import accounts')
  } finally {
    importing.value = false
  }
}
</script>
