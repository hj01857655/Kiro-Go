import { ref } from 'vue'

export function useAccountAuth(password, toast, t) {
  // IAM SSO Session
  const ssoSession = ref({
    active: false,
    loading: false,
    completing: false,
    startUrl: '',
    region: 'us-east-1',
    authorizeUrl: '',
    callbackUrl: ''
  })

  // Builder ID Session
  const builderIdSession = ref({
    active: false,
    loading: false,
    region: 'us-east-1',
    deviceCode: '',
    userCode: '',
    verificationUrl: '',
    expiresIn: 0,
    interval: 5,
    statusMessage: 'Waiting for authorization...',
    pollingTimer: null,
    expirationTimer: null
  })

  async function startIamSsoLogin() {
    ssoSession.value.loading = true
    try {
      const res = await fetch('/admin/api/auth/iam-sso/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          startUrl: ssoSession.value.startUrl,
          region: ssoSession.value.region
        })
      })

      if (res.ok) {
        const data = await res.json()
        ssoSession.value.active = true
        ssoSession.value.authorizeUrl = data.authorizeUrl
        toast.info(t('accounts.ssoLoginStarted'))
        return { success: true }
      } else {
        const error = await res.json()
        toast.error(t('accounts.failedToStartSsoLogin') + ': ' + (error.error || t('accounts.unknownError')))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToStartSsoLogin') + ': ' + e.message)
      return { success: false }
    } finally {
      ssoSession.value.loading = false
    }
  }

  async function completeIamSsoLogin() {
    ssoSession.value.completing = true
    try {
      const res = await fetch('/admin/api/auth/iam-sso/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          callbackUrl: ssoSession.value.callbackUrl
        })
      })

      if (res.ok) {
        toast.success(t('accounts.accountAddedViaSso'))
        cancelSsoLogin()
        return { success: true }
      } else {
        const error = await res.json()
        toast.error(t('accounts.failedToCompleteSsoLogin') + ': ' + (error.error || t('accounts.unknownError')))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToCompleteSsoLogin') + ': ' + e.message)
      return { success: false }
    } finally {
      ssoSession.value.completing = false
    }
  }

  function cancelSsoLogin() {
    ssoSession.value.active = false
    ssoSession.value.loading = false
    ssoSession.value.completing = false
    ssoSession.value.startUrl = ''
    ssoSession.value.authorizeUrl = ''
    ssoSession.value.callbackUrl = ''
  }

  async function startBuilderIdLogin() {
    builderIdSession.value.loading = true
    try {
      const res = await fetch('/admin/api/auth/builderid/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          region: builderIdSession.value.region
        })
      })

      if (res.ok) {
        const data = await res.json()
        builderIdSession.value.active = true
        builderIdSession.value.deviceCode = data.deviceCode
        builderIdSession.value.userCode = data.userCode
        builderIdSession.value.verificationUrl = data.verificationUrl
        builderIdSession.value.expiresIn = data.expiresIn
        builderIdSession.value.interval = data.interval || 5
        builderIdSession.value.statusMessage = 'Waiting for authorization...'

        toast.info(t('accounts.builderIdLoginStarted'))
        return { success: true, startPolling: true }
      } else {
        const error = await res.json()
        toast.error(t('accounts.failedToStartBuilderIdLogin') + ': ' + (error.error || t('accounts.unknownError')))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToStartBuilderIdLogin') + ': ' + e.message)
      return { success: false }
    } finally {
      builderIdSession.value.loading = false
    }
  }

  function startBuilderIdPolling(onSuccess) {
    // Clear any existing timers
    if (builderIdSession.value.pollingTimer) {
      clearInterval(builderIdSession.value.pollingTimer)
    }
    if (builderIdSession.value.expirationTimer) {
      clearInterval(builderIdSession.value.expirationTimer)
    }

    // Start countdown timer for expiration
    builderIdSession.value.expirationTimer = setInterval(() => {
      if (builderIdSession.value.expiresIn > 0) {
        builderIdSession.value.expiresIn--
      } else {
        clearInterval(builderIdSession.value.expirationTimer)
        if (builderIdSession.value.active) {
          cancelBuilderIdLogin()
          toast.error(t('accounts.builderIdAuthExpired'))
        }
      }
    }, 1000)

    // Start polling for authorization
    builderIdSession.value.pollingTimer = setInterval(async () => {
      try {
        const res = await fetch('/admin/api/auth/builderid/poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          },
          body: JSON.stringify({
            deviceCode: builderIdSession.value.deviceCode
          })
        })

        if (res.ok) {
          const data = await res.json()

          if (data.status === 'pending') {
            builderIdSession.value.statusMessage = 'Waiting for authorization...'
          } else if (data.status === 'authorized') {
            clearInterval(builderIdSession.value.pollingTimer)
            clearInterval(builderIdSession.value.expirationTimer)
            toast.success(t('accounts.accountAddedViaBuilderID'))
            cancelBuilderIdLogin()
            if (onSuccess) onSuccess()
          } else if (data.status === 'expired') {
            clearInterval(builderIdSession.value.pollingTimer)
            clearInterval(builderIdSession.value.expirationTimer)
            cancelBuilderIdLogin()
            toast.error(t('accounts.builderIdAuthExpired'))
          } else if (data.status === 'denied') {
            clearInterval(builderIdSession.value.pollingTimer)
            clearInterval(builderIdSession.value.expirationTimer)
            cancelBuilderIdLogin()
            toast.error(t('accounts.builderIdAuthDenied'))
          }
        } else {
          const error = await res.json()
          if (error.error && error.error.includes('slow_down')) {
            builderIdSession.value.statusMessage = 'Polling too fast, slowing down...'
          } else {
            builderIdSession.value.statusMessage = 'Polling for authorization...'
          }
        }
      } catch (e) {
        console.error('Polling error:', e)
        builderIdSession.value.statusMessage = 'Connection error, retrying...'
      }
    }, builderIdSession.value.interval * 1000)
  }

  function cancelBuilderIdLogin() {
    if (builderIdSession.value.pollingTimer) {
      clearInterval(builderIdSession.value.pollingTimer)
      builderIdSession.value.pollingTimer = null
    }
    if (builderIdSession.value.expirationTimer) {
      clearInterval(builderIdSession.value.expirationTimer)
      builderIdSession.value.expirationTimer = null
    }
    builderIdSession.value.active = false
    builderIdSession.value.loading = false
    builderIdSession.value.deviceCode = ''
    builderIdSession.value.userCode = ''
    builderIdSession.value.verificationUrl = ''
    builderIdSession.value.expiresIn = 0
    builderIdSession.value.statusMessage = 'Waiting for authorization...'
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(t('accounts.copiedToClipboard'))
      }).catch(() => {
        fallbackCopyToClipboard(text)
      })
    } else {
      fallbackCopyToClipboard(text)
    }
  }

  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      toast.success(t('accounts.copiedToClipboard'))
    } catch (err) {
      toast.error(t('accounts.failedToCopyToClipboard'))
    }
    document.body.removeChild(textArea)
  }

  return {
    ssoSession,
    builderIdSession,
    startIamSsoLogin,
    completeIamSsoLogin,
    cancelSsoLogin,
    startBuilderIdLogin,
    startBuilderIdPolling,
    cancelBuilderIdLogin,
    copyToClipboard
  }
}
