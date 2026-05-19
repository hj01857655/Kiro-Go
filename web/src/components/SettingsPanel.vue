<template>
  <div class="flex flex-col gap-5">
    <!-- 基础设置 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.basicSettings') }}</h3>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.serverPort') }}</label>
        <input v-model.number="settings.port" type="number" placeholder="8080" class="input">
      </div>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.serverHost') }}</label>
        <input v-model="settings.host" type="text" placeholder="127.0.0.1" class="input">
      </div>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.adminPassword') }}</label>
        <input v-model="settings.password" type="password" :placeholder="t('settings.adminPasswordPlaceholder')" class="input">
      </div>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.apiKey') }}</label>
        <input v-model="settings.apiKey" type="text" :placeholder="t('settings.apiKeyPlaceholder')" class="input">
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.apiKeyHelp') }}</small>
      </div>
      <div class="mb-0">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="settings.apiKeyRequired" type="checkbox" class="w-auto cursor-pointer">
          <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.requireApiKey') }}</span>
        </label>
      </div>
    </div>

    <!-- Proxy 设置 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.proxySettings') }}</h3>
      <div class="mb-0">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.globalProxyURL') }}</label>
        <input v-model="settings.proxyURL" type="text" :placeholder="t('settings.proxyURLPlaceholder')" class="input">
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.proxyURLHelp') }}</small>
      </div>
    </div>

    <!-- Thinking 配置 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.thinkingConfiguration') }}</h3>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.thinkingSuffix') }}</label>
        <input v-model="thinking.suffix" type="text" :placeholder="t('settings.thinkingSuffixPlaceholder')" class="input">
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.thinkingSuffixHelp') }}</small>
      </div>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.openaiFormat') }}</label>
        <select v-model="thinking.openaiFormat" class="input">
          <option value="">{{ t('settings.formatNone') }}</option>
          <option value="reasoning_content">reasoning_content</option>
          <option value="thinking">thinking</option>
          <option value="think">think</option>
        </select>
      </div>
      <div class="mb-0">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.claudeFormat') }}</label>
        <select v-model="thinking.claudeFormat" class="input">
          <option value="">{{ t('settings.formatNone') }}</option>
          <option value="reasoning_content">reasoning_content</option>
          <option value="thinking">thinking</option>
          <option value="think">think</option>
        </select>
      </div>
    </div>

    <!-- Endpoint 配置 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.endpointSettings') }}</h3>
      <div class="mb-4">
        <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.preferredEndpoint') }}</label>
        <select v-model="endpoint.preferred" class="input">
          <option value="">{{ t('settings.endpointAuto') }}</option>
          <option value="kiro">{{ t('settings.endpointKiro') }}</option>
          <option value="codewhisperer">{{ t('settings.endpointCodewhisperer') }}</option>
          <option value="amazonq">{{ t('settings.endpointAmazonq') }}</option>
        </select>
      </div>
      <div class="mb-0">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="endpoint.enableFallback" type="checkbox" class="w-auto cursor-pointer">
          <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.enableFallback') }}</span>
        </label>
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.enableFallbackHelp') }}</small>
      </div>
    </div>

    <!-- Prompt 过滤 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.promptFiltering') }}</h3>
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="promptFilter.filterClaudeCode" type="checkbox" class="w-auto cursor-pointer">
          <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.filterClaudeCode') }}</span>
        </label>
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.filterClaudeCodeHelp') }}</small>
      </div>
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="promptFilter.filterEnvNoise" type="checkbox" class="w-auto cursor-pointer">
          <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.filterEnvNoise') }}</span>
        </label>
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.filterEnvNoiseHelp') }}</small>
      </div>
      <div class="mb-0">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="promptFilter.filterStripBoundaries" type="checkbox" class="w-auto cursor-pointer">
          <span class="text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.filterStripBoundaries') }}</span>
        </label>
        <small class="block mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t('settings.filterStripBoundariesHelp') }}</small>
      </div>
    </div>

    <!-- 自定义过滤规则 -->
    <div class="card">
      <h3 class="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">{{ t('settings.customFilterRules') }}</h3>
      <div v-for="(rule, idx) in promptFilter.rules" :key="idx" class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3">
        <div class="mb-4">
          <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.ruleType') }}</label>
          <select v-model="rule.type" class="input">
            <option value="regex">{{ t('settings.ruleTypeRegex') }}</option>
            <option value="lines-containing">{{ t('settings.ruleTypeLinesContaining') }}</option>
          </select>
        </div>
        <div class="mb-4">
          <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.matchPattern') }}</label>
          <input v-model="rule.match" type="text" :placeholder="t('settings.matchPatternPlaceholder')" class="input">
        </div>
        <div v-if="rule.type === 'regex'" class="mb-4">
          <label class="block mb-1.5 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('settings.replaceWith') }}</label>
          <input v-model="rule.replace" type="text" :placeholder="t('settings.replaceWithPlaceholder')" class="input">
        </div>
        <button @click="removeRule(idx)" class="btn-danger btn-sm">{{ t('settings.removeRule') }}</button>
      </div>
      <button @click="addRule" class="btn-secondary btn-sm">{{ t('settings.addRule') }}</button>
    </div>

    <!-- 保存按钮 -->
    <div class="flex gap-3 justify-end">
      <button @click="saveSettings" class="btn-primary" :disabled="saving">
        {{ saving ? t('settings.saving') : t('settings.saveSettings') }}
      </button>
      <button @click="loadSettings" class="btn-secondary">{{ t('settings.reset') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'

const props = defineProps(['password'])
const toast = inject('toast')
const { t } = inject('i18n')
const saving = ref(false)

const settings = ref({
  port: 8080,
  host: '127.0.0.1',
  password: '',
  apiKey: '',
  apiKeyRequired: false,
  proxyURL: ''
})

const thinking = ref({
  suffix: '-thinking',
  openaiFormat: '',
  claudeFormat: ''
})

const endpoint = ref({
  preferred: '',
  enableFallback: true
})

const promptFilter = ref({
  filterClaudeCode: false,
  filterEnvNoise: false,
  filterStripBoundaries: false,
  rules: []
})

onMounted(() => {
  loadSettings()
})

async function loadSettings() {
  try {
    // 加载基础设置
    const settingsRes = await fetch('/admin/api/settings', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (settingsRes.ok) {
      const data = await settingsRes.json()
      settings.value = {
        port: data.port || 8080,
        host: data.host || '127.0.0.1',
        password: '',
        apiKey: data.apiKey || '',
        apiKeyRequired: data.apiKeyRequired || false,
        proxyURL: data.proxyURL || ''
      }
    }

    // 加载 thinking 配置
    const thinkingRes = await fetch('/admin/api/thinking', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (thinkingRes.ok) {
      thinking.value = await thinkingRes.json()
    }

    // 加载 endpoint 配置
    const endpointRes = await fetch('/admin/api/endpoint', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (endpointRes.ok) {
      endpoint.value = await endpointRes.json()
    }

    // 加载 prompt filter 配置
    const filterRes = await fetch('/admin/api/prompt-filter', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (filterRes.ok) {
      promptFilter.value = await filterRes.json()
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
}

async function saveSettings() {
  saving.value = true
  try {
    // 保存基础设置
    await fetch('/admin/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(settings.value)
    })

    // 保存 thinking 配置
    await fetch('/admin/api/thinking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(thinking.value)
    })

    // 保存 endpoint 配置
    await fetch('/admin/api/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(endpoint.value)
    })

    // 保存 prompt filter 配置
    await fetch('/admin/api/prompt-filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(promptFilter.value)
    })

    toast.success(t('settings.settingsSaved'))
  } catch (e) {
    toast.error(t('settings.settingsFailed') + ': ' + e.message)
  } finally {
    saving.value = false
  }
}

function addRule() {
  promptFilter.value.rules.push({
    type: 'regex',
    match: '',
    replace: ''
  })
}

function removeRule(idx) {
  promptFilter.value.rules.splice(idx, 1)
}
</script>

