<template>
  <el-alert
    v-if="selectedCount > 0"
    type="info"
    :closable="false"
    class="batch-actions-bar"
  >
    <template #title>
      <div class="actions-container">
        <span class="selected-text">
          {{ selectedCount }} {{ t('accounts.selected') }}
        </span>
        <el-button-group>
          <el-button size="small" :loading="testing" @click="$emit('batch-test')">
            <el-icon><Opportunity /></el-icon>
            {{ testing ? t('accounts.testing') : t('accounts.testSelected') }}
          </el-button>
          <el-button size="small" type="success" @click="$emit('batch-enable')">
            <el-icon><CircleCheck /></el-icon>
            {{ t('accounts.enableSelected') }}
          </el-button>
          <el-button size="small" type="warning" @click="$emit('batch-disable')">
            <el-icon><CircleClose /></el-icon>
            {{ t('accounts.disableSelected') }}
          </el-button>
          <el-button size="small" type="danger" @click="$emit('batch-delete')">
            <el-icon><Delete /></el-icon>
            {{ t('accounts.deleteSelected') }}
          </el-button>
          <el-button size="small" @click="$emit('clear-selection')">
            <el-icon><Close /></el-icon>
            {{ t('accounts.clearSelection') }}
          </el-button>
        </el-button-group>
      </div>
    </template>
  </el-alert>
</template>

<script setup>
import { inject } from 'vue'
import { Opportunity, CircleCheck, CircleClose, Delete, Close } from '@element-plus/icons-vue'

defineProps({
  selectedCount: { type: Number, required: true },
  testing: { type: Boolean, default: false }
})

defineEmits([
  'batch-test',
  'batch-enable',
  'batch-disable',
  'batch-delete',
  'clear-selection'
])

const { t } = inject('i18n')
</script>

<style scoped>
.batch-actions-bar {
  margin-bottom: 16px;
}

.actions-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.selected-text {
  font-weight: 600;
  font-size: 14px;
}
</style>
