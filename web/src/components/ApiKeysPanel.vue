<template>
  <div class="card">
    <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('apiKeys.title') }}</h2>
      <button @click="showCreateModal = true" class="btn-primary btn-sm">
        + {{ t('apiKeys.createKey') }}
      </button>
    </div>

    <div class="mb-5">
      <p class="text-gray-600 dark:text-gray-400 mb-3">{{ t('apiKeys.description') }}</p>
      <div class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
        <span class="text-lg">ℹ️</span>
        <span>{{ t('apiKeys.securityNote') }}</span>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="flex flex-col gap-3">
      <SkeletonLoader v-for="i in 3" :key="i" type="table-row" />
    </div>

    <!-- API Keys List -->
    <div v-else-if="apiKeys.length > 0" class="flex flex-col gap-3">
      <div v-for="key in apiKeys" :key="key.id" class="key-card">
        <div class="flex justify-between items-center mb-3">
          <div class="flex-1">
            <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{{ key.name }}</h4>
            <span class="text-xs text-gray-500 dark:text-gray-500 font-mono">{{ t('apiKeys.keyId') }}: {{ key.id }}</span>
          </div>
          <div class="flex gap-2">
            <button @click="toggleKeyStatus(key)" class="btn-sm" :class="key.enabled ? 'btn-warning' : 'btn-success'">
              {{ key.enabled ? t('common.disable') : t('common.enable') }}
            </button>
            <button @click="editKey(key)" class="btn-secondary btn-sm">{{ t('common.edit') }}</button>
            <button @click="deleteKey(key.id)" class="btn-danger btn-sm">{{ t('common.delete') }}</button>
          </div>
        </div>

        <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 mb-3">
          <div class="flex gap-2 text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ t('apiKeys.status') }}:</span>
            <span :class="key.enabled ? 'text-success' : 'text-error'">
              {{ key.enabled ? t('apiKeys.active') : t('apiKeys.inactive') }}
            </span>
          </div>
          <div class="flex gap-2 text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ t('apiKeys.createdAt') }}:</span>
            <span class="text-gray-900 dark:text-gray-100">{{ formatDate(key.createdAt) }}</span>
          </div>
          <div class="flex gap-2 text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ t('apiKeys.lastUsed') }}:</span>
            <span class="text-gray-900 dark:text-gray-100">{{ key.lastUsed ? formatDate(key.lastUsed) : t('accounts.never') }}</span>
          </div>
          <div class="flex gap-2 text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ t('apiKeys.usageCount') }}:</span>
            <span class="text-gray-900 dark:text-gray-100">{{ key.usageCount || 0 }}</span>
          </div>
          <div v-if="key.expiresAt" class="flex gap-2 text-sm">
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ t('apiKeys.expiresAt') }}:</span>
            <span class="text-gray-900 dark:text-gray-100" :class="isExpired(key.expiresAt) ? 'text-error' : ''">
              {{ formatDate(key.expiresAt) }}
            </span>
          </div>
        </div>

        <div v-if="key.permissions && key.permissions.length > 0" class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <span class="text-[13px] font-medium text-gray-600 dark:text-gray-400 block mb-2">{{ t('apiKeys.permissions') }}:</span>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="perm in key.permissions" :key="perm" class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-900 dark:text-gray-100 font-mono">
              {{ perm }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-15">
      <div class="text-5xl mb-4">🔑</div>
      <p class="text-gray-600 dark:text-gray-400 mb-5">{{ t('apiKeys.noKeys') }}</p>
      <button @click="showCreateModal = true" class="btn-primary">
        {{ t('apiKeys.createFirstKey') }}
      </button>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ showCreateModal ? t('apiKeys.createKey') : t('apiKeys.editKey') }}</h3>
          <button @click="closeModal" class="text-2xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 leading-none">&times;</button>
        </div>

        <div class="mb-5">
          <div class="mb-4">
            <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('apiKeys.keyName') }} *</label>
            <input
              v-model="keyForm.name"
              type="text"
              :placeholder="t('apiKeys.keyNamePlaceholder')"
              required
              class="input"
            >
            <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('apiKeys.keyNameHelp') }}</small>
          </div>

          <div class="mb-4">
            <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('apiKeys.expiresAt') }}</label>
            <select v-model="keyForm.expiresIn" class="input">
              <option value="">{{ t('apiKeys.neverExpires') }}</option>
              <option value="7">{{ t('apiKeys.expires7Days') }}</option>
              <option value="30">{{ t('apiKeys.expires30Days') }}</option>
              <option value="90">{{ t('apiKeys.expires90Days') }}</option>
              <option value="365">{{ t('apiKeys.expires1Year') }}</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('apiKeys.permissions') }}</label>
            <div class="flex flex-col gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <label v-for="perm in availablePermissions" :key="perm.value" class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  :value="perm.value"
                  v-model="keyForm.permissions"
                  class="cursor-pointer"
                >
                <span class="text-gray-900 dark:text-gray-100">{{ perm.label }}</span>
              </label>
            </div>
            <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('apiKeys.permissionsHelp') }}</small>
          </div>

          <div class="mb-0">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="keyForm.enabled" class="cursor-pointer">
              <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('apiKeys.enableImmediately') }}</span>
            </label>
          </div>
        </div>

        <div class="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="closeModal" class="btn-secondary">{{ t('common.cancel') }}</button>
          <button @click="saveKey" class="btn-primary" :disabled="saving || !keyForm.name">
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Key Created Success Modal -->
    <div v-if="showSuccessModal" class="modal" @click.self="showSuccessModal = false">
      <div class="modal-content">
        <div class="flex justify-between items-center mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('apiKeys.keyCreated') }}</h3>
          <button @click="showSuccessModal = false" class="text-2xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 leading-none">&times;</button>
        </div>

        <div class="mb-5">
          <div class="text-center mb-5">
            <div class="text-5xl mb-3">✅</div>
            <p class="text-gray-600 dark:text-gray-400">{{ t('apiKeys.keyCreatedMessage') }}</p>
          </div>

          <div class="mb-5">
            <label class="block mb-2 font-medium text-gray-900 dark:text-gray-100">{{ t('apiKeys.yourApiKey') }}</label>
            <div class="flex gap-2 items-center">
              <code class="flex-1 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-[13px] break-all text-gray-900 dark:text-gray-100">{{ createdKey }}</code>
              <button @click="copyKey" class="btn-secondary btn-sm">
                {{ copied ? t('apiKeys.copied') : t('apiKeys.copy') }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <span class="text-lg">⚠️</span>
            <span>{{ t('apiKeys.copyWarning') }}</span>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="showSuccessModal = false" class="btn-primary">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
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

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString()
}

function isExpired(dateString) {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}
</script>

<style scoped>
.key-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.key-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
