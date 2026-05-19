<template>
  <div style="display: flex; flex-direction: column; gap: 20px;">
    <!-- Basic Settings -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.basicSettings') }}</h3>
      </template>
      <el-form label-position="top">
        <el-form-item :label="t('settings.serverPort')">
          <el-input-number v-model="settings.port" :min="1" :max="65535" style="width: 100%;" />
        </el-form-item>
        <el-form-item :label="t('settings.serverHost')">
          <el-input v-model="settings.host" placeholder="127.0.0.1" />
        </el-form-item>
        <el-form-item :label="t('settings.adminPassword')">
          <el-input v-model="settings.password" type="password" :placeholder="t('settings.adminPasswordPlaceholder')" show-password />
        </el-form-item>
        <el-form-item :label="t('settings.apiKey')">
          <el-input v-model="settings.apiKey" :placeholder="t('settings.apiKeyPlaceholder')" />
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.apiKeyHelp') }}
            </span>
          </template>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="settings.apiKeyRequired">{{ t('settings.requireApiKey') }}</el-checkbox>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Proxy Settings -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.proxySettings') }}</h3>
      </template>
      <el-form label-position="top">
        <el-form-item :label="t('settings.globalProxyURL')">
          <el-input v-model="settings.proxyURL" :placeholder="t('settings.proxyURLPlaceholder')" />
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.proxyURLHelp') }}
            </span>
          </template>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Thinking Configuration -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.thinkingConfiguration') }}</h3>
      </template>
      <el-form label-position="top">
        <el-form-item :label="t('settings.thinkingSuffix')">
          <el-input v-model="thinking.suffix" :placeholder="t('settings.thinkingSuffixPlaceholder')" />
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.thinkingSuffixHelp') }}
            </span>
          </template>
        </el-form-item>
        <el-form-item :label="t('settings.openaiFormat')">
          <el-select v-model="thinking.openaiFormat" style="width: 100%;">
            <el-option value="" :label="t('settings.formatNone')" />
            <el-option value="reasoning_content" label="reasoning_content" />
            <el-option value="thinking" label="thinking" />
            <el-option value="think" label="think" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('settings.claudeFormat')">
          <el-select v-model="thinking.claudeFormat" style="width: 100%;">
            <el-option value="" :label="t('settings.formatNone')" />
            <el-option value="reasoning_content" label="reasoning_content" />
            <el-option value="thinking" label="thinking" />
            <el-option value="think" label="think" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Endpoint Settings -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.endpointSettings') }}</h3>
      </template>
      <el-form label-position="top">
        <el-form-item :label="t('settings.preferredEndpoint')">
          <el-select v-model="endpoint.preferred" style="width: 100%;">
            <el-option value="" :label="t('settings.endpointAuto')" />
            <el-option value="kiro" :label="t('settings.endpointKiro')" />
            <el-option value="codewhisperer" :label="t('settings.endpointCodewhisperer')" />
            <el-option value="amazonq" :label="t('settings.endpointAmazonq')" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="endpoint.enableFallback">{{ t('settings.enableFallback') }}</el-checkbox>
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.enableFallbackHelp') }}
            </span>
          </template>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Prompt Filtering -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.promptFiltering') }}</h3>
      </template>
      <el-form label-position="top">
        <el-form-item>
          <el-checkbox v-model="promptFilter.filterClaudeCode">{{ t('settings.filterClaudeCode') }}</el-checkbox>
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.filterClaudeCodeHelp') }}
            </span>
          </template>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="promptFilter.filterEnvNoise">{{ t('settings.filterEnvNoise') }}</el-checkbox>
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.filterEnvNoiseHelp') }}
            </span>
          </template>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="promptFilter.filterStripBoundaries">{{ t('settings.filterStripBoundaries') }}</el-checkbox>
          <template #extra>
            <span style="font-size: 12px; color: var(--el-text-color-secondary);">
              {{ t('settings.filterStripBoundariesHelp') }}
            </span>
          </template>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Custom Filter Rules -->
    <el-card>
      <template #header>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">{{ t('settings.customFilterRules') }}</h3>
      </template>
      <div v-for="(rule, idx) in promptFilter.rules" :key="idx" style="margin-bottom: 16px;">
        <el-card shadow="never">
          <el-form label-position="top">
            <el-form-item :label="t('settings.ruleType')">
              <el-select v-model="rule.type" style="width: 100%;">
                <el-option value="regex" :label="t('settings.ruleTypeRegex')" />
                <el-option value="lines-containing" :label="t('settings.ruleTypeLinesContaining')" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('settings.matchPattern')">
              <el-input v-model="rule.match" :placeholder="t('settings.matchPatternPlaceholder')" />
            </el-form-item>
            <el-form-item v-if="rule.type === 'regex'" :label="t('settings.replaceWith')">
              <el-input v-model="rule.replace" :placeholder="t('settings.replaceWithPlaceholder')" />
            </el-form-item>
            <el-button type="danger" size="small" @click="removeRule(idx)">
              {{ t('settings.removeRule') }}
            </el-button>
          </el-form>
        </el-card>
      </div>
      <el-button size="small" @click="addRule">{{ t('settings.addRule') }}</el-button>
    </el-card>

    <!-- Save Buttons -->
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <el-button @click="loadSettings">{{ t('settings.reset') }}</el-button>
      <el-button type="primary" :loading="saving" @click="saveSettings">
        {{ t('settings.saveSettings') }}
      </el-button>
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

    const thinkingRes = await fetch('/admin/api/thinking', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (thinkingRes.ok) {
      thinking.value = await thinkingRes.json()
    }

    const endpointRes = await fetch('/admin/api/endpoint', {
      headers: { 'X-Admin-Password': props.password }
    })
    if (endpointRes.ok) {
      endpoint.value = await endpointRes.json()
    }

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
    await fetch('/admin/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(settings.value)
    })

    await fetch('/admin/api/thinking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(thinking.value)
    })

    await fetch('/admin/api/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(endpoint.value)
    })

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
