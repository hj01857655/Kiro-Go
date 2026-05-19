<template>
  <div :class="[theme, 'min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300']">
    <!-- Login Page -->
    <div v-if="!authenticated" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-4 transition-all duration-300">
      <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-sm relative transition-all duration-300">
        <h1 class="text-center text-primary text-2xl mb-2">🚀 {{ t('login.title') }}</h1>
        <p class="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">{{ t('login.subtitle') }}</p>

        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label class="block mb-2 text-gray-700 dark:text-gray-300 text-sm font-medium">{{ t('login.password') }}</label>
            <input
              v-model="password"
              type="password"
              :placeholder="t('login.passwordPlaceholder')"
              class="input"
              autofocus
            >
          </div>
          <button type="submit" class="btn-primary w-full">{{ t('login.loginButton') }}</button>
          <p v-if="loginError" class="text-error text-sm text-center mt-2">{{ loginError }}</p>
        </form>

        <!-- Theme & Language Toggle -->
        <div class="flex gap-2 justify-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button @click="toggleTheme" class="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-lg" :title="t('theme.toggle')">
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <button @click="toggleLanguage" class="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-lg" :title="t('language.toggle')">
            {{ locale === 'en' ? '🇨🇳' : '🇺🇸' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main App -->
    <div v-else class="max-w-7xl mx-auto p-4">
      <!-- Header -->
      <header class="flex justify-between items-center mb-5">
        <h1 class="text-2xl font-semibold text-primary">Kiro-Go Admin</h1>
        <div class="flex gap-2 items-center">
          <button @click="toggleTheme" class="btn-secondary btn-sm" :title="t('theme.toggle')">
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <button @click="toggleLanguage" class="btn-secondary btn-sm" :title="t('language.toggle')">
            {{ locale === 'en' ? '中文' : 'EN' }}
          </button>
          <button @click="logout" class="btn-secondary btn-sm">{{ t('login.logout') }}</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'px-4 py-2.5 rounded-lg cursor-pointer font-medium text-sm transition-all',
            currentTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
          @click="currentTab = tab.id"
        >
          {{ t(`nav.${tab.id}`) }}
        </div>
      </div>

      <!-- Tab Content -->
      <div v-show="currentTab === 'accounts'">
        <AccountsPanel :password="password" />
      </div>

      <div v-show="currentTab === 'apikeys'">
        <ApiKeysPanel :password="password" />
      </div>

      <div v-show="currentTab === 'auditlogs'">
        <AuditLogsPanel :password="password" />
      </div>

      <div v-show="currentTab === 'settings'">
        <SettingsPanel :password="password" />
      </div>

      <div v-show="currentTab === 'stats'">
        <StatsPanel :password="password" />
      </div>
    </div>

    <!-- Global Components -->
    <Toast ref="toastRef" />
    <ConfirmDialog ref="confirmDialogRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, provide, watch } from 'vue'
import AccountsPanel from './components/AccountsPanel.vue'
import ApiKeysPanel from './components/ApiKeysPanel.vue'
import AuditLogsPanel from './components/AuditLogsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import Toast from './components/Toast.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { createI18n } from './i18n.js'

const authenticated = ref(false)
const password = ref('')
const toastRef = ref(null)
const confirmDialogRef = ref(null)
const loginError = ref('')
const currentTab = ref('accounts')

// Theme and i18n
const theme = ref('light')
const locale = ref('en')
const i18n = createI18n(locale.value)
const { t } = i18n

// Provide toast to all child components
provide('toast', {
  success: (message, title) => toastRef.value?.success(message, title),
  error: (message, title) => toastRef.value?.error(message, title),
  warning: (message, title) => toastRef.value?.warning(message, title),
  info: (message, title) => toastRef.value?.info(message, title)
})

// Provide confirm dialog to all child components
provide('confirm', (options) => confirmDialogRef.value?.show(options))

// Provide i18n to all child components
provide('i18n', { t, locale })

// Provide theme to all child components
provide('theme', theme)

const tabs = [
  { id: 'accounts' },
  { id: 'apikeys' },
  { id: 'auditlogs' },
  { id: 'settings' },
  { id: 'stats' }
]

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
