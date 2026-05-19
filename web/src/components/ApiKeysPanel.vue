<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">{{ t('apiKeys.title') }}</h2>
        <el-button type="primary" size="small" @click="showCreateModal = true">
          <el-icon><Plus /></el-icon>
          {{ t('apiKeys.createKey') }}
        </el-button>
      </div>
    </template>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      <template #title>
        <p style="margin: 0 0 8px 0;">{{ t('apiKeys.description') }}</p>
      </template>
      {{ t('apiKeys.securityNote') }}
    </el-alert>

    <!-- Loading -->
    <div v-if="loading">
      <el-skeleton :rows="4" animated style="margin-bottom: 16px;" />
      <el-skeleton :rows="4" animated style="margin-bottom: 16px;" />
      <el-skeleton :rows="4" animated />
    </div>

    <!-- API Keys List -->
    <div v-else-if="apiKeys.length > 0" style="display: flex; flex-direction: column; gap: 16px;">
      <el-card v-for="key in apiKeys" :key="key.id" shadow="hover">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">{{ key.name }}</h4>
            <span style="font-size: 12px; color: var(--el-text-color-secondary); font-family: monospace;">
              {{ t('apiKeys.keyId') }}: {{ key.id }}
            </span>
          </div>
          <el-button-group>
            <el-button
              size="small"
              :type="key.enabled ? 'warning' : 'success'"
              @click="toggleKeyStatus(key)"
            >
              {{ key.enabled ? t('common.disable') : t('common.enable') }}
            </el-button>
            <el-button size="small" @click="editKey(key)">{{ t('common.edit') }}</el-button>
            <el-button size="small" type="danger" @click="deleteKey(key.id)">{{ t('common.delete') }}</el-button>
          </el-button-group>
        </div>

        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item :label="t('apiKeys.status')">
            <el-tag :type="key.enabled ? 'success' : 'danger'" size="small">
              {{ key.enabled ? t('apiKeys.active') : t('apiKeys.inactive') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="t('apiKeys.createdAt')">
            {{ formatDate(key.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('apiKeys.lastUsed')">
            {{ key.lastUsed ? formatDate(key.lastUsed) : t('accounts.never') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('apiKeys.usageCount')">
            {{ key.usageCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item v-if="key.expiresAt" :label="t('apiKeys.expiresAt')" :span="2">
            <span :style="{ color: isExpired(key.expiresAt) ? 'var(--el-color-danger)' : '' }">
              {{ formatDate(key.expiresAt) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="key.permissions && key.permissions.length > 0" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--el-border-color);">
          <span style="font-size: 13px; font-weight: 500; color: var(--el-text-color-secondary); display: block; margin-bottom: 8px;">
            {{ t('apiKeys.permissions') }}:
          </span>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <el-tag v-for="perm in key.permissions" :key="perm" size="small">{{ perm }}</el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Empty State -->
    <el-empty v-else :description="t('apiKeys.noKeys')">
      <el-button type="primary" @click="showCreateModal = true">
        {{ t('apiKeys.createFirstKey') }}
      </el-button>
    </el-empty>

    <!-- Create/Edit Modal -->
    <el-dialog
      :model-value="showCreateModal || showEditModal"
      :title="showCreateModal ? t('apiKeys.createKey') : t('apiKeys.editKey')"
      width="600px"
      @close="closeModal"
    >
      <el-form label-position="top">
        <el-form-item :label="t('apiKeys.keyName') + ' *'">
          <el-input v-model="keyForm.name" :placeholder="t('apiKeys.keyNamePlaceholder')" />
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('apiKeys.keyNameHelp') }}
            </span>
          </template>
        </el-form-item>

        <el-form-item :label="t('apiKeys.expiresAt')">
          <el-select v-model="keyForm.expiresIn" style="width: 100%;">
            <el-option value="" :label="t('apiKeys.neverExpires')" />
            <el-option value="7" :label="t('apiKeys.expires7Days')" />
            <el-option value="30" :label="t('apiKeys.expires30Days')" />
            <el-option value="90" :label="t('apiKeys.expires90Days')" />
            <el-option value="365" :label="t('apiKeys.expires1Year')" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('apiKeys.permissions')">
          <el-checkbox-group v-model="keyForm.permissions">
            <el-checkbox v-for="perm in availablePermissions" :key="perm.value" :value="perm.value">
              {{ perm.label }}
            </el-checkbox>
          </el-checkbox-group>
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('apiKeys.permissionsHelp') }}
            </span>
          </template>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="keyForm.enabled">{{ t('apiKeys.enableImmediately') }}</el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeModal">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" :disabled="!keyForm.name" @click="saveKey">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Success Modal -->
    <el-dialog
      :model-value="showSuccessModal"
      :title="t('apiKeys.keyCreated')"
      width="600px"
      @close="showSuccessModal = false"
    >
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <p style="color: var(--el-text-color-secondary);">{{ t('apiKeys.keyCreatedMessage') }}</p>
      </div>

      <el-form-item :label="t('apiKeys.yourApiKey')">
        <el-input :model-value="createdKey" readonly>
          <template #append>
            <el-button @click="copyKey">
              {{ copied ? t('apiKeys.copied') : t('apiKeys.copy') }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-alert type="warning" :closable="false" style="margin-top: 16px;">
        {{ t('apiKeys.copyWarning') }}
      </el-alert>

      <template #footer>
        <el-button type="primary" @click="showSuccessModal = false">
          {{ t('common.close') }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps(['password'])
const toast = inject('toast')
const confirm = inject('confirm')
const { t } = inject('i18n')

const apiKeys = ref([])
const loading = ref(true)
const saving = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showSuccessModal = ref(false)
const createdKey = ref('')
const copied = ref(false)
const editingKeyId = ref(null)

const keyForm = ref({
  name: '',
  expiresIn: '',
  permissions: [],
  enabled: true
})

const availablePermissions = computed(() => [
  { value: 'messages:read', label: t('apiKeys.permMessagesRead') },
  { value: 'messages:write', label: t('apiKeys.permMessagesWrite') },
  { value: 'accounts:read', label: t('apiKeys.permAccountsRead') },
  { value: 'accounts:write', label: t('apiKeys.permAccountsWrite') },
  { value: 'stats:read', label: t('apiKeys.permStatsRead') }
])

onMounted(() => {
  loadApiKeys()
})

async function loadApiKeys() {
  loading.value = true
  try {
    const res = await fetch('/admin/api/keys', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (res.ok) {
      apiKeys.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load API keys:', e)
  } finally {
    loading.value = false
  }
}

async function saveKey() {
  saving.value = true
  try {
    const endpoint = showEditModal.value
      ? `/admin/api/keys/${editingKeyId.value}`
      : '/admin/api/keys'

    const method = showEditModal.value ? 'PUT' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(keyForm.value)
    })

    if (res.ok) {
      const data = await res.json()

      if (showCreateModal.value && data.key) {
        createdKey.value = data.key
        showSuccessModal.value = true
      } else {
        toast.success(t('apiKeys.keyUpdated'))
      }

      closeModal()
      loadApiKeys()
    } else {
      const error = await res.json()
      toast.error(t('apiKeys.saveFailed') + ': ' + (error.error || 'Unknown error'))
    }
  } catch (e) {
    toast.error(t('apiKeys.saveFailed') + ': ' + e.message)
  } finally {
    saving.value = false
  }
}

async function toggleKeyStatus(key) {
  try {
    const res = await fetch(`/admin/api/keys/${key.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify({ enabled: !key.enabled })
    })

    if (res.ok) {
      toast.success(key.enabled ? t('apiKeys.keyDisabled') : t('apiKeys.keyEnabled'))
      loadApiKeys()
    }
  } catch (e) {
    toast.error(t('apiKeys.failedToUpdateKeyStatus'))
  }
}

function editKey(key) {
  editingKeyId.value = key.id
  keyForm.value = {
    name: key.name,
    expiresIn: '',
    permissions: key.permissions || [],
    enabled: key.enabled
  }
  showEditModal.value = true
}

async function deleteKey(keyId) {
  const confirmed = await confirm({
    title: t('apiKeys.deleteConfirmTitle'),
    message: t('apiKeys.deleteConfirmMessage'),
    type: 'danger',
    confirmText: t('common.delete'),
    cancelText: t('common.cancel')
  })

  if (!confirmed) return

  try {
    const res = await fetch(`/admin/api/keys/${keyId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Password': props.password }
    })

    if (res.ok) {
      toast.success(t('apiKeys.keyDeleted'))
      loadApiKeys()
    }
  } catch (e) {
    toast.error(t('apiKeys.failedToDeleteKey'))
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingKeyId.value = null
  keyForm.value = {
    name: '',
    expiresIn: '',
    permissions: [],
    enabled: true
  }
}

function copyKey() {
  navigator.clipboard.writeText(createdKey.value)
  copied.value = true
  toast.success(t('apiKeys.keyCopied'))
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return date.toLocaleString()
}

function isExpired(timestamp) {
  if (!timestamp) return false
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return date < new Date()
}
</script>
