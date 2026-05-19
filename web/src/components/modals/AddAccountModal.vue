<template>
  <el-dialog
    :model-value="show"
    :title="t('accounts.addAccountTitle')"
    width="900px"
    @close="$emit('close')"
  >
    <template #header>
      <div>
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">{{ t('accounts.addAccountTitle') }}</h3>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--el-text-color-secondary);">
          {{ t('accounts.addAccountSubtitle') || 'Choose an authentication method to add a new account' }}
        </p>
      </div>
    </template>

    <el-scrollbar max-height="70vh">
      <!-- Auth Method Selection -->
      <el-radio-group v-model="newAccount.authMethod" style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
        <el-radio-button v-for="method in authMethods" :key="method.value" :value="method.value">
          <span style="margin-right: 6px;">{{ method.icon }}</span>
          {{ t(`accounts.${method.labelKey}`) }}
        </el-radio-button>
      </el-radio-group>

      <!-- Manual Token Input -->
      <div v-if="newAccount.authMethod === 'manual'">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          {{ t('accounts.manuallyEnterTokens') }}
        </el-alert>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.accessToken') + ' *'">
            <el-input v-model="newAccount.accessToken" type="textarea" :rows="3" :placeholder="t('accounts.enterAccessToken')" />
          </el-form-item>
          <el-form-item :label="t('accounts.refreshToken') + ' *'">
            <el-input v-model="newAccount.refreshToken" type="textarea" :rows="3" :placeholder="t('accounts.enterRefreshToken')" />
          </el-form-item>
          <el-form-item :label="t('accounts.region')">
            <el-select v-model="newAccount.region" style="width: 100%;">
              <el-option value="us-east-1" label="US East 1" />
              <el-option value="us-west-2" label="US West 2" />
              <el-option value="eu-west-1" label="EU West 1" />
              <el-option value="ap-southeast-1" label="AP Southeast 1" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- IAM SSO Login -->
      <div v-if="newAccount.authMethod === 'iam-sso'">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          {{ t('accounts.iamSsoDescription') }}
        </el-alert>

        <div v-if="!ssoSession.active">
          <el-form label-position="top">
            <el-form-item :label="t('accounts.startUrl') + ' *'">
              <el-input v-model="ssoSession.startUrl" :placeholder="t('accounts.startUrlPlaceholder')" />
              <template #extra>
                <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                  {{ t('accounts.startUrlHelp') }}
                </span>
              </template>
            </el-form-item>
            <el-form-item :label="t('accounts.region')">
              <el-select v-model="ssoSession.region" style="width: 100%;">
                <el-option value="us-east-1" label="US East 1" />
                <el-option value="us-west-2" label="US West 2" />
                <el-option value="eu-west-1" label="EU West 1" />
                <el-option value="ap-southeast-1" label="AP Southeast 1" />
              </el-select>
            </el-form-item>
          </el-form>
          <el-button type="primary" :loading="ssoSession.loading" :disabled="!ssoSession.startUrl" @click="handleStartIamSso">
            {{ ssoSession.loading ? t('accounts.starting') : t('accounts.startSsoLogin') }}
          </el-button>
        </div>

        <div v-else style="display: flex; flex-direction: column; gap: 16px;">
          <el-card shadow="never">
            <template #header>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">🔐</span>
                <strong>{{ t('accounts.ssoStep1Title') }}</strong>
              </div>
            </template>
            <p style="margin-bottom: 12px; font-size: 13px; color: var(--el-text-color-secondary);">
              {{ t('accounts.ssoStep1Description') }}
            </p>
            <el-button type="primary" style="width: 100%; margin-bottom: 12px;" @click="window.open(ssoSession.authorizeUrl, '_blank')">
              {{ t('accounts.openAuthPage') }}
            </el-button>
            <el-input :model-value="ssoSession.authorizeUrl" readonly size="small" />
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">📋</span>
                <strong>{{ t('accounts.ssoStep2Title') }}</strong>
              </div>
            </template>
            <p style="margin-bottom: 12px; font-size: 13px; color: var(--el-text-color-secondary);">
              {{ t('accounts.ssoStep2Description') }}
            </p>
            <el-form label-position="top">
              <el-form-item :label="t('accounts.callbackUrl') + ' *'">
                <el-input v-model="ssoSession.callbackUrl" :placeholder="t('accounts.callbackUrlPlaceholder')" />
                <template #extra>
                  <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                    {{ t('accounts.callbackUrlHelp') }}
                  </span>
                </template>
              </el-form-item>
            </el-form>
            <el-button type="success" :loading="ssoSession.completing" :disabled="!ssoSession.callbackUrl" @click="handleCompleteIamSso">
              {{ ssoSession.completing ? t('accounts.completing') : t('accounts.completeLogin') }}
            </el-button>
          </el-card>

          <el-button size="small" @click="handleCancelSso">{{ t('accounts.cancelSsoLogin') }}</el-button>
        </div>
      </div>

      <!-- Builder ID Login -->
      <div v-if="newAccount.authMethod === 'builderid'">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          {{ t('accounts.builderIdDescription') }}
        </el-alert>

        <div v-if="!builderIdSession.active">
          <el-form label-position="top">
            <el-form-item :label="t('accounts.region')">
              <el-select v-model="builderIdSession.region" style="width: 100%;">
                <el-option value="us-east-1" label="US East 1" />
                <el-option value="us-west-2" label="US West 2" />
                <el-option value="eu-west-1" label="EU West 1" />
                <el-option value="ap-southeast-1" label="AP Southeast 1" />
              </el-select>
            </el-form-item>
          </el-form>
          <el-button type="primary" :loading="builderIdSession.loading" @click="handleStartBuilderId">
            {{ builderIdSession.loading ? t('accounts.starting') : t('accounts.startBuilderIdLogin') }}
          </el-button>
        </div>

        <div v-else>
          <el-card shadow="never">
            <template #header>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">🔑</span>
                <strong>{{ t('accounts.deviceAuthTitle') }}</strong>
              </div>
            </template>
            <p style="margin-bottom: 16px; font-size: 13px; color: var(--el-text-color-secondary);">
              {{ t('accounts.deviceAuthDescription') }}
            </p>

            <el-form label-position="top">
              <el-form-item :label="t('accounts.verificationUrl')">
                <el-input :model-value="builderIdSession.verificationUrl" readonly>
                  <template #append>
                    <el-button @click="handleCopyToClipboard(builderIdSession.verificationUrl)">📋</el-button>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item :label="t('accounts.userCode')">
                <el-input :model-value="builderIdSession.userCode" readonly style="font-family: monospace; font-size: 18px; font-weight: bold;">
                  <template #append>
                    <el-button @click="handleCopyToClipboard(builderIdSession.userCode)">📋</el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-form>

            <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
              <template #title>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  {{ t('accounts.waitingForAuth') }}
                </div>
              </template>
            </el-alert>

            <p style="font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 16px;">
              {{ t('accounts.codeExpiresIn', { seconds: builderIdSession.expiresIn }) }}
            </p>

            <el-row :gutter="12">
              <el-col :span="12">
                <el-button style="width: 100%;" @click="handleCancelBuilderId">
                  {{ t('accounts.cancelBuilderIdLogin') }}
                </el-button>
              </el-col>
              <el-col :span="12">
                <el-button type="primary" style="width: 100%;" @click="handleRetryBuilderId">
                  <el-icon><Refresh /></el-icon>
                  {{ t('accounts.retryBuilderIdLogin') }}
                </el-button>
              </el-col>
            </el-row>
          </el-card>
        </div>
      </div>

      <!-- SSO Token Import -->
      <div v-if="newAccount.authMethod === 'sso-token'">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          {{ t('accounts.ssoTokenDescription') }}
        </el-alert>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.region')">
            <el-select v-model="newAccount.region" style="width: 100%;">
              <el-option value="us-east-1" label="US East 1" />
              <el-option value="us-west-2" label="US West 2" />
              <el-option value="eu-west-1" label="EU West 1" />
              <el-option value="ap-southeast-1" label="AP Southeast 1" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('accounts.ssoTokensLabel') + ' *'">
            <el-input v-model="newAccount.ssoTokens" type="textarea" :rows="6" :placeholder="t('accounts.ssoTokensPlaceholder')" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.ssoTokensHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </div>

      <!-- Credentials JSON Import -->
      <div v-if="newAccount.authMethod === 'credentials'">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          {{ t('accounts.credentialsDescription') }}
        </el-alert>
        <el-form label-position="top">
          <el-form-item :label="t('accounts.credentialsJsonLabel') + ' *'">
            <el-input v-model="newAccount.credentialsJson" type="textarea" :rows="8" :placeholder="t('accounts.credentialsJsonPlaceholder')" />
            <template #extra>
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                {{ t('accounts.credentialsJsonHelp') }}
              </span>
            </template>
          </el-form-item>
        </el-form>
      </div>
    </el-scrollbar>

    <template #footer>
      <div v-if="['manual', 'sso-token', 'credentials'].includes(newAccount.authMethod)">
        <el-button @click="$emit('close')">{{ t('accounts.cancel') }}</el-button>
        <el-button
          type="primary"
          :disabled="!canSubmit"
          @click="handleAddAccount"
        >
          {{ t('accounts.addAccount') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, inject, onUnmounted, computed } from 'vue'
import { Loading, Refresh } from '@element-plus/icons-vue'
import { useAccountAuth } from '../../composables/useAccountAuth'

const props = defineProps({
  show: { type: Boolean, required: true },
  password: { type: String, required: true }
})

const emit = defineEmits(['close', 'added'])

const { t } = inject('i18n')
const toast = inject('toast')

const authMethods = [
  { value: 'manual', icon: '✍️', labelKey: 'manualToken' },
  { value: 'iam-sso', icon: '🔐', labelKey: 'iamSso' },
  { value: 'builderid', icon: '🔑', labelKey: 'builderId' },
  { value: 'sso-token', icon: '📋', labelKey: 'ssoToken' },
  { value: 'credentials', icon: '📄', labelKey: 'credentialsJson' }
]

const newAccount = ref({
  authMethod: 'manual',
  accessToken: '',
  refreshToken: '',
  region: 'us-east-1',
  ssoTokens: '',
  credentialsJson: ''
})

const canSubmit = computed(() => {
  if (newAccount.value.authMethod === 'manual') {
    return newAccount.value.accessToken && newAccount.value.refreshToken
  }
  if (newAccount.value.authMethod === 'sso-token') {
    return newAccount.value.ssoTokens
  }
  if (newAccount.value.authMethod === 'credentials') {
    return newAccount.value.credentialsJson
  }
  return false
})

const {
  ssoSession,
  builderIdSession,
  startIamSsoLogin,
  completeIamSsoLogin,
  cancelSsoLogin,
  startBuilderIdLogin,
  cancelBuilderIdLogin,
  copyToClipboard
} = useAccountAuth(props.password, toast, t)

onUnmounted(() => {
  if (ssoSession.value.active) {
    cancelSsoLogin()
  }
  if (builderIdSession.value.active) {
    cancelBuilderIdLogin()
  }
})

async function handleStartIamSso() {
  const result = await startIamSsoLogin(ssoSession.value.startUrl, ssoSession.value.region)
  if (result.success) {
    // Session is now active
  }
}

async function handleCompleteIamSso() {
  const result = await completeIamSsoLogin(ssoSession.value.callbackUrl)
  if (result.success) {
    toast.success('Account added successfully via IAM SSO')
    emit('added')
    emit('close')
    resetForm()
  }
}

function handleCancelSso() {
  cancelSsoLogin()
}

async function handleStartBuilderId() {
  const result = await startBuilderIdLogin(builderIdSession.value.region)
  if (result.success) {
    const checkCompletion = setInterval(() => {
      if (!builderIdSession.value.active) {
        clearInterval(checkCompletion)
        if (builderIdSession.value.completed) {
          toast.success('Account added successfully via Builder ID')
          emit('added')
          emit('close')
          resetForm()
        }
      }
    }, 1000)
  }
}

function handleCancelBuilderId() {
  cancelBuilderIdLogin()
}

async function handleRetryBuilderId() {
  cancelBuilderIdLogin()
  await handleStartBuilderId()
}

function handleCopyToClipboard(text) {
  copyToClipboard(text)
}

async function handleAddAccount() {
  try {
    const payload = {
      authMethod: newAccount.value.authMethod,
      region: newAccount.value.region
    }

    if (newAccount.value.authMethod === 'manual') {
      payload.accessToken = newAccount.value.accessToken
      payload.refreshToken = newAccount.value.refreshToken
    } else if (newAccount.value.authMethod === 'sso-token') {
      payload.ssoTokens = newAccount.value.ssoTokens
    } else if (newAccount.value.authMethod === 'credentials') {
      payload.credentialsJson = newAccount.value.credentialsJson
    }

    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': props.password
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add account')
    }

    toast.success('Account added successfully')
    emit('added')
    emit('close')
    resetForm()
  } catch (error) {
    console.error('Add account error:', error)
    toast.error(error.message || 'Failed to add account')
  }
}

function resetForm() {
  newAccount.value = {
    authMethod: 'manual',
    accessToken: '',
    refreshToken: '',
    region: 'us-east-1',
    ssoTokens: '',
    credentialsJson: ''
  }
}
</script>
