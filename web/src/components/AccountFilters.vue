<template>
  <el-card shadow="never" class="filters-card">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :md="8">
        <el-input
          :model-value="searchQuery"
          @input="$emit('update:searchQuery', $event)"
          :placeholder="t('accounts.searchPlaceholder')"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </el-col>
      <el-col :xs="8" :sm="4" :md="4">
        <el-select
          :model-value="filterType"
          @change="$emit('update:filterType', $event)"
          :placeholder="t('accounts.allTypes')"
        >
          <el-option value="all" :label="t('accounts.allTypes')">
            <el-icon><Document /></el-icon>
            {{ t('accounts.allTypes') }}
          </el-option>
          <el-option value="free" :label="t('accounts.free')" />
          <el-option value="pro" :label="t('accounts.pro')" />
          <el-option value="pro_plus" :label="t('accounts.proPlus')" />
          <el-option value="power" :label="t('accounts.power')" />
        </el-select>
      </el-col>
      <el-col :xs="8" :sm="4" :md="4">
        <el-select
          :model-value="filterStatus"
          @change="$emit('update:filterStatus', $event)"
          :placeholder="t('accounts.allStatus')"
        >
          <el-option value="all" :label="t('accounts.allStatus')" />
          <el-option value="enabled" :label="t('accounts.enabled')" />
          <el-option value="disabled" :label="t('accounts.disabled')" />
        </el-select>
      </el-col>
      <el-col :xs="8" :sm="4" :md="4">
        <el-select
          :model-value="sortBy"
          @change="$emit('update:sortBy', $event)"
          :placeholder="t('accounts.sortByEmail')"
        >
          <el-option value="email" :label="t('accounts.sortByEmail')" />
          <el-option value="usage" :label="t('accounts.sortByUsage')" />
          <el-option value="type" :label="t('accounts.sortByType')" />
          <el-option value="status" :label="t('accounts.sortByStatus')" />
        </el-select>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { inject } from 'vue'
import { Search, Document } from '@element-plus/icons-vue'

defineProps({
  searchQuery: { type: String, required: true },
  filterType: { type: String, required: true },
  filterStatus: { type: String, required: true },
  sortBy: { type: String, required: true }
})

defineEmits([
  'update:searchQuery',
  'update:filterType',
  'update:filterStatus',
  'update:sortBy'
])

const { t } = inject('i18n')
</script>

<style scoped>
.filters-card {
  margin-bottom: 16px;
}
</style>
