<template>
  <el-card class="account-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <el-checkbox
          :model-value="selected"
          @change="$emit('toggle-selection', account.id)"
        />
        <div class="title-section">
          <h3 class="account-title">{{ account.nickname || account.email }}</h3>
          <div class="badges">
            <el-tag :type="getTagType(account)" size="small">
              {{ account.subscriptionType || 'FREE' }}
            </el-tag>
            <el-tag :type="account.enabled ? 'success' : 'danger'" size="small">
              {{ account.enabled ? t('accounts.enabled') : t('accounts.disabled') }}
            </el-tag>
          </div>
        </div>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button type="text" class="menu-btn">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">
                <el-icon><Edit /></el-icon>
                {{ t('common.edit') }}
              </el-dropdown-item>
              <el-dropdown-item command="refresh">
                <el-icon><Refresh /></el-icon>
                {{ t('common.refresh') }}
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon>
                {{ t('common.delete') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>

    <!-- Info -->
    <div class="info-section">
      <div class="info-item">
        <el-icon><Message /></el-icon>
        <span>{{ account.email }}</span>
      </div>
      <div class="info-item">
        <el-icon><Location /></el-icon>
        <span>{{ account.region || 'N/A' }}</span>
      </div>
      <div class="info-item">
        <el-icon><Lock /></el-icon>
        <span>{{ getAuthMethodLabel(account.authMethod) }}</span>
      </div>
      <div class="info-item">
        <el-icon><Calendar /></el-icon>
        <span>{{ account.nextResetDate || t('common.unknown') }}</span>
      </div>
    </div>

    <!-- Usage -->
    <div class="usage-section">
      <div class="usage-header">
        <span class="usage-label">{{ t('accounts.usage') }}</span>
        <span class="usage-value">
          {{ account.usageCurrent?.toFixed(1) || 0 }} / {{ account.usageLimit?.toFixed(1) || 0 }}
          ({{ getUsagePercent(account).toFixed(1) }}%)
        </span>
      </div>
      <el-progress
        :percentage="Math.min(100, getUsagePercent(account))"
        :status="getProgressStatus(account)"
        :show-text="false"
      />
    </div>

    <!-- Actions -->
    <template #footer>
      <div class="actions">
        <el-button size="small" @click="$emit('view-details', account.id)">
          <el-icon><View /></el-icon>
          {{ t('common.details') }}
        </el-button>
        <el-button
          size="small"
          :type="account.enabled ? 'warning' : 'success'"
          @click="$emit('toggle-status', account)"
        >
          <el-icon v-if="account.enabled"><VideoPause /></el-icon>
          <el-icon v-else><VideoPlay /></el-icon>
          {{ account.enabled ? t('common.disable') : t('common.enable') }}
        </el-button>
        <el-button
          size="small"
          :loading="testing"
          @click="$emit('test', account.id)"
        >
          <el-icon v-if="!testing"><Opportunity /></el-icon>
          {{ testing ? t('accounts.testing') : t('common.test') }}
        </el-button>
        <el-button
          v-if="accountSupportsOverage(account)"
          size="small"
          :type="accountOverageEnabled(account) ? 'warning' : ''"
          @click="$emit('toggle-overage', account)"
        >
          <el-icon><CreditCard /></el-icon>
        </el-button>
      </div>
    </template>
  </el-card>
</template>

<script setup>
import { inject } from 'vue'
import { useAccountUtils } from '../composables/useAccountUtils'
import {
  MoreFilled,
  Edit,
  Refresh,
  Delete,
  Message,
  Location,
  Lock,
  Calendar,
  View,
  VideoPause,
  VideoPlay,
  Opportunity,
  CreditCard
} from '@element-plus/icons-vue'

const props = defineProps({
  account: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  testing: { type: Boolean, default: false }
})

const emit = defineEmits([
  'toggle-selection',
  'view-details',
  'toggle-status',
  'test',
  'toggle-overage',
  'edit',
  'refresh',
  'delete'
])

const { t } = inject('i18n')

const {
  getUsagePercent,
  getBadgeClass,
  getUsageColorClass,
  getUsageProgressClass,
  getAuthMethodLabel,
  accountSupportsOverage,
  accountOverageEnabled
} = useAccountUtils(t)

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

function handleCommand(command) {
  if (command === 'edit') emit('edit', props.account)
  else if (command === 'refresh') emit('refresh', props.account.id)
  else if (command === 'delete') emit('delete', props.account.id)
}
</script>

<style scoped>
.account-card {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-section {
  flex: 1;
  min-width: 0;
}

.account-title {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.menu-btn {
  font-size: 20px;
  padding: 4px;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.info-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.usage-section {
  margin-bottom: 16px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.usage-label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
}

.usage-value {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .info-section {
    grid-template-columns: 1fr;
  }
}
</style>
