<template>
  <div id="app">
    <!-- Login Page -->
    <div v-if="!authenticated" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;">
      <el-card style="width: 100%; max-width: 400px;">
        <template #header>
          <div style="text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; color: var(--el-color-primary);">🚀 {{ t('login.title') }}</h1>
            <p style="margin: 0; font-size: 14px; color: var(--el-text-color-secondary);">{{ t('login.subtitle') }}</p>
          </div>
        </template>

        <el-form @submit.prevent="login">
          <el-form-item :label="t('login.password')">
            <el-input
              v-model="password"
              type="password"
              :placeholder="t('login.passwordPlaceholder')"
              show-password
              autofocus
              @keyup.enter="login"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" style="width: 100%;" @click="login">
              {{ t('login.loginButton') }}
            </el-button>
          </el-form-item>
          <el-alert v-if="loginError" type="error" :closable="false" :title="loginError" />
        </el-form>

        <template #footer>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <el-button @click="toggleTheme" :title="t('theme.toggle')">
              {{ theme === 'light' ? '🌙' : '☀️' }}
            </el-button>
            <el-button @click="toggleLanguage" :title="t('language.toggle')">
              {{ locale === 'en' ? '🇨🇳' : '🇺🇸' }}
            </el-button>
          </div>
        </template>
      </el-card>
    </div>

    <!-- Main App -->
    <div v-else style="max-width: 1400px; margin: 0 auto; padding: 16px;">
      <!-- Header -->
      <el-page-header style="margin-bottom: 20px;">
        <template #content>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: var(--el-color-primary);">
            Kiro-Go Admin
          </h1>
        </template>
        <template #extra>
          <el-button-group>
            <el-button size="small" @click="toggleTheme" :title="t('theme.toggle')">
              {{ theme === 'light' ? '🌙' : '☀️' }}
            </el-button>
            <el-button size="small" @click="toggleLanguage" :title="t('language.toggle')">
              {{ locale === 'en' ? '中文' : 'EN' }}
            </el-button>
            <el-button size="small" @click="logout">{{ t('login.logout') }}</el-button>
          </el-button-group>
        </template>
      </el-page-header>

      <!-- Tabs -->
      <el-tabs v-model="currentTab" type="card">
        <el-tab-pane :label="t('nav.accounts')" name="accounts">
          <AccountsPanel :password="password" />
        </el-tab-pane>
        <el-tab-pane :label="t('nav.apikeys')" name="apikeys">
          <ApiKeysPanel :password="password" />
        </el-tab-pane>
        <el-tab-pane :label="t('nav.auditlogs')" name="auditlogs">
          <AuditLogsPanel :password="password" />
        </el-tab-pane>
        <el-tab-pane :label="t('nav.settings')" name="settings">
          <SettingsPanel :password="password" />
        </el-tab-pane>
        <el-tab-pane :label="t('nav.stats')" name="stats">
          <StatsPanel :password="password" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AccountsPanel from './components/AccountsPanel.vue'
import ApiKeysPanel from './components/ApiKeysPanel.vue'
import AuditLogsPanel from './components/AuditLogsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import { createI18n } from './i18n.js'

const authenticated = ref(false)
const password = ref('')
const loginError = ref('')
const currentTab = ref('accounts')

// Theme and i18n
const theme = ref('light')
const locale = ref('en')
const i18n = createI18n(locale.value)
const { t } = i18n

// Provide toast using Element Plus ElMessage
provide('toast', {
  success: (message, title) => ElMessage.success({ message, duration: 3000 }),
  error: (message, title) => ElMessage.error({ message, duration: 5000 }),
  warning: (message, title) => ElMessage.warning({ message, duration: 3000 }),
  info: (message, title) => ElMessage.info({ message, duration: 3000 })
})

// Provide confirm dialog using Element Plus ElMessageBox
provide('confirm', async (options) => {
  try {
    await ElMessageBox.confirm(
      options.message,
      options.title,
      {
        confirmButtonText: options.confirmText || t('common.confirm'),
        cancelButtonText: options.cancelText || t('common.cancel'),
        type: options.type === 'danger' ? 'error' : options.type || 'warning'
      }
    )
    return true
  } catch {
    return false
  }
})

// Provide i18n to all child components
provide('i18n', { t, locale })

// Provide theme to all child components
provide('theme', theme)

// Watch locale changes and update i18n
watch(locale, (newLocale) => {
  i18n.setLocale(newLocale)
  localStorage.setItem('locale', newLocale)
})

// Watch theme changes and update document class
watch(theme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

function toggleLanguage() {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

onMounted(async () => {
  // Load saved password
  const saved = localStorage.getItem('admin_password')
  if (saved) {
    password.value = saved
    const valid = await verifyPassword()
    if (valid) {
      authenticated.value = true
    }
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    theme.value = savedTheme
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }

  // Load saved locale
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
    locale.value = savedLocale
    i18n.setLocale(savedLocale)
  }
})

async function login() {
  loginError.value = ''
  const valid = await verifyPassword()
  if (valid) {
    localStorage.setItem('admin_password', password.value)
    authenticated.value = true
  } else {
    loginError.value = t('login.invalidPassword')
  }
}

async function verifyPassword() {
  try {
    const res = await fetch('/admin/api/status', {
      headers: { 'X-Admin-Password': password.value }
    })
    return res.ok
  } catch {
    return false
  }
}

function logout() {
  localStorage.removeItem('admin_password')
  authenticated.value = false
  password.value = ''
}
</script>
