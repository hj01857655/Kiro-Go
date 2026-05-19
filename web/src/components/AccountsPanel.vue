<template>
  <el-card>
    <!-- Header -->
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">
          {{ t('accounts.title') }} ({{ filteredAccounts.length }} / {{ accounts.length }})
        </h2>
        <el-button-group>
          <el-button size="small" @click="showImportModal = true">
            <el-icon><Upload /></el-icon>
            {{ t('accounts.importAccounts') }}
          </el-button>
          <el-button size="small" @click="handleExport" :disabled="loading || accounts.length === 0">
            <el-icon><Download /></el-icon>
            {{ t('accounts.exportAccounts') }}
          </el-button>
          <el-button size="small" @click="handleRefreshAll" :disabled="loading">
            <el-icon><Refresh /></el-icon>
            {{ t('accounts.refreshAll') }}
          </el-button>
          <el-button size="small" type="primary" @click="showAddModal = true">
            <el-icon><Plus /></el-icon>
            {{ t('accounts.addAccount') }}
          </el-button>
        </el-button-group>
      </div>
    </template>

    <!-- Statistics -->
    <AccountStats
      :total="accounts.length"
      :enabled="enabledCount"
      :disabled="disabledCount"
      :pro="proCount"
      :auto-refresh="autoRefresh"
      @toggle-auto-refresh="toggleAutoRefresh"
    />

    <!-- Search and Filter -->
    <AccountFilters
      v-model:search-query="searchQuery"
      v-model:filter-type="filterType"
      v-model:filter-status="filterStatus"
      v-model:sort-by="sortBy"
    />

    <!-- Batch Actions -->
    <BatchActionsBar
      v-if="selectedAccounts.size > 0"
      :selected-count="selectedAccounts.size"
      :testing="batchTesting"
      @batch-test="handleBatchTest"
      @batch-enable="handleBatchEnable"
      @batch-disable="handleBatchDisable"
      @batch-delete="handleBatchDelete"
      @clear-selection="selectedAccounts.clear()"
    />

    <!-- Loading -->
    <div v-if="loading">
      <el-skeleton v-for="i in 6" :key="i" :rows="4" animated style="margin-bottom: 16px;" />
    </div>

    <!-- Account List -->
    <div v-else-if="filteredAccounts.length > 0">
      <AccountCard
        v-for="acc in filteredAccounts"
        :key="acc.id"
        :account="acc"
        :selected="selectedAccounts.has(acc.id)"
        :testing="testingAccounts.has(acc.id)"
        @toggle-selection="toggleSelection"
        @view-details="viewAccountDetails"
        @toggle-status="handleToggleStatus"
        @test="handleTest"
        @toggle-overage="handleToggleOverage"
        @edit="handleEdit"
        @refresh="handleRefresh"
        @delete="handleDelete"
      />
    </div>

    <!-- Empty State -->
    <el-empty v-else :description="t('accounts.noAccounts')" />

    <!-- Modals -->
    <AddAccountModal
      :show="showAddModal"
      :password="password"
      @close="showAddModal = false"
      @added="handleAccountAdded"
    />

    <EditAccountModal
      :show="showEditModal"
      :account="editingAccount"
      :password="password"
      @close="showEditModal = false"
      @saved="handleAccountSaved"
      @overage-toggled="handleAccountSaved"
    />

    <ImportAccountModal
      :show="showImportModal"
      :password="password"
      @close="showImportModal = false"
      @imported="handleAccountsImported"
    />

    <AccountDetailsModal
      :show="showDetailsModal"
      :account-id="selectedAccountId"
      :password="password"
      @close="showDetailsModal = false"
      @overage-toggled="handleAccountSaved"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { Upload, Download, Refresh, Plus } from '@element-plus/icons-vue'
import AccountStats from './AccountStats.vue'
import AccountFilters from './AccountFilters.vue'
import AccountCard from './AccountCard.vue'
import BatchActionsBar from './BatchActionsBar.vue'
import AddAccountModal from './modals/AddAccountModal.vue'
import EditAccountModal from './modals/EditAccountModal.vue'
import ImportAccountModal from './modals/ImportAccountModal.vue'
import AccountDetailsModal from './modals/AccountDetailsModal.vue'

import { useAccountOperations } from '../composables/useAccountOperations'
import { useAccountFilters } from '../composables/useAccountFilters'

const props = defineProps(['password'])
const toast = inject('toast')
const confirm = inject('confirm')
const { t } = inject('i18n')

// State
const accounts = ref([])
const selectedAccounts = ref(new Set())
const autoRefresh = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const showDetailsModal = ref(false)
const editingAccount = ref(null)
const selectedAccountId = ref(null)
let refreshInterval = null

// Composables
const {
  loading,
  testingAccounts,
  batchTesting,
  loadAccounts,
  deleteAccount,
  refreshAccount,
  testAccount,
  toggleAccountStatus,
  batchOperation,
  batchTest,
  exportAccounts,
  refreshAllAccounts
} = useAccountOperations(props.password, toast, confirm, t)

const {
  searchQuery,
  filterType,
  filterStatus,
  sortBy,
  filteredAccounts,
  enabledCount,
  disabledCount,
  proCount
} = useAccountFilters(accounts)

// Lifecycle
onMounted(async () => {
  await loadAccountsData()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Methods
async function loadAccountsData() {
  const data = await loadAccounts()
  accounts.value = data
}

function toggleSelection(id) {
  if (selectedAccounts.value.has(id)) {
    selectedAccounts.value.delete(id)
  } else {
    selectedAccounts.value.add(id)
  }
}

function toggleAutoRefresh(enabled) {
  autoRefresh.value = enabled
  if (enabled) {
    refreshInterval = setInterval(() => {
      loadAccountsData()
    }, 30000)
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
}

async function handleToggleStatus(acc) {
  const result = await toggleAccountStatus(acc)
  if (result.success) {
    await loadAccountsData()
  }
}

async function handleTest(id) {
  await testAccount(id)
}

async function handleRefresh(id) {
  const result = await refreshAccount(id)
  if (result.success) {
    await loadAccountsData()
  }
}

async function handleDelete(id) {
  const result = await deleteAccount(id)
  if (result.success) {
    selectedAccounts.value.delete(id)
    await loadAccountsData()
  }
}

function handleEdit(acc) {
  editingAccount.value = { ...acc }
  showEditModal.value = true
}

async function handleAccountAdded() {
  await loadAccountsData()
}

async function handleAccountSaved() {
  await loadAccountsData()
}

async function handleAccountsImported() {
  await loadAccountsData()
}

async function handleBatchTest() {
  const confirmed = await confirm({
    title: 'Test Accounts',
    message: `Test ${selectedAccounts.value.size} selected account(s)? This will send a test request to each account.`,
    type: 'info',
    confirmText: 'Test',
    cancelText: 'Cancel'
  })
  if (!confirmed) return

  await batchTest(Array.from(selectedAccounts.value))
}

async function handleBatchEnable() {
  const confirmed = await confirm({
    title: 'Enable Accounts',
    message: `Enable ${selectedAccounts.value.size} selected account(s)?`,
    type: 'info',
    confirmText: 'Enable',
    cancelText: 'Cancel'
  })
  if (!confirmed) return

  const result = await batchOperation(Array.from(selectedAccounts.value), 'enable')
  if (result.success) {
    selectedAccounts.value.clear()
    await loadAccountsData()
  }
}

async function handleBatchDisable() {
  const confirmed = await confirm({
    title: 'Disable Accounts',
    message: `Disable ${selectedAccounts.value.size} selected account(s)?`,
    type: 'warning',
    confirmText: 'Disable',
    cancelText: 'Cancel'
  })
  if (!confirmed) return

  const result = await batchOperation(Array.from(selectedAccounts.value), 'disable')
  if (result.success) {
    selectedAccounts.value.clear()
    await loadAccountsData()
  }
}

async function handleBatchDelete() {
  const confirmed = await confirm({
    title: 'Delete Accounts',
    message: `Delete ${selectedAccounts.value.size} selected account(s)? This action cannot be undone.`,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })
  if (!confirmed) return

  const result = await batchOperation(Array.from(selectedAccounts.value), 'delete')
  if (result.success) {
    selectedAccounts.value.clear()
    await loadAccountsData()
  }
}

async function handleExport() {
  await exportAccounts()
}

async function handleRefreshAll() {
  const result = await refreshAllAccounts(accounts.value)
  if (result.success) {
    await loadAccountsData()
  }
}

function viewAccountDetails(accountId) {
  selectedAccountId.value = accountId
  showDetailsModal.value = true
}

async function handleToggleOverage(acc) {
  editingAccount.value = { ...acc }
  showEditModal.value = true
}
</script>
