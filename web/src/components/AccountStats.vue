<template>
  <el-card shadow="never" class="stats-card">
    <el-row :gutter="20" align="middle">
      <el-col :xs="12" :sm="6">
        <el-statistic :value="total" :title="t('accounts.total')">
          <template #prefix>
            <el-icon color="#409EFF"><Document /></el-icon>
          </template>
        </el-statistic>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic :value="enabled" :title="t('accounts.enabled')">
          <template #prefix>
            <el-icon color="#67C23A"><CircleCheck /></el-icon>
          </template>
        </el-statistic>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic :value="disabled" :title="t('accounts.disabled')">
          <template #prefix>
            <el-icon color="#F56C6C"><CircleClose /></el-icon>
          </template>
        </el-statistic>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-statistic :value="pro" :title="t('accounts.proPlus')">
          <template #prefix>
            <el-icon color="#9B59B6"><Star /></el-icon>
          </template>
        </el-statistic>
      </el-col>
      <el-col :span="24" style="margin-top: 16px;">
        <el-checkbox :model-value="autoRefresh" @change="$emit('toggle-auto-refresh', $event)">
          {{ t('accounts.autoRefresh') }}
        </el-checkbox>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { inject } from 'vue'
import { Document, CircleCheck, CircleClose, Star } from '@element-plus/icons-vue'

defineProps({
  total: { type: Number, required: true },
  enabled: { type: Number, required: true },
  disabled: { type: Number, required: true },
  pro: { type: Number, required: true },
  autoRefresh: { type: Boolean, default: false }
})

defineEmits(['toggle-auto-refresh'])

const { t } = inject('i18n')
</script>

<style scoped>
.stats-card {
  margin-bottom: 16px;
}
</style>
