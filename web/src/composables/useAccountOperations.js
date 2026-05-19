import { ref } from 'vue'

export function useAccountOperations(password, toast, confirm, t) {
  const loading = ref(false)
  const testingAccounts = ref(new Set())
  const batchTesting = ref(false)

  async function loadAccounts() {
    loading.value = true
    try {
      const res = await fetch('/admin/api/accounts', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        return await res.json()
      }
      return []
    } catch (e) {
      console.error('Failed to load accounts:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function addAccount(accountData) {
    try {
      if (accountData.authMethod === 'sso-token') {
        const tokens = accountData.ssoTokens.split('\n').map(t => t.trim()).filter(t => t)
        if (tokens.length === 0) {
          toast.warning(t('accounts.pleaseEnterSsoTokens'))
          return { success: false }
        }

        const res = await fetch('/admin/api/auth/sso-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          },
          body: JSON.stringify({
            tokens: tokens,
            region: accountData.region
          })
        })

        if (res.ok) {
          const data = await res.json()
          if (data.imported?.length > 0) {
            toast.success(`${data.imported.length} ${t('accounts.accountsImported')}`)
          }
          if (data.errors?.length > 0) {
            toast.warning(`${data.errors.length} ${t('accounts.failed')}`)
          }
          return { success: true }
        } else {
          toast.error(t('accounts.failedToImportSsoTokens'))
          return { success: false }
        }
      } else if (accountData.authMethod === 'credentials') {
        if (!accountData.credentialsJson.trim()) {
          toast.warning(t('accounts.pleaseEnterCredentialsJson'))
          return { success: false }
        }

        let credentials
        try {
          credentials = JSON.parse(accountData.credentialsJson)
        } catch (e) {
          toast.error(t('accounts.invalidJsonFormat'))
          return { success: false }
        }

        const res = await fetch('/admin/api/auth/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          },
          body: JSON.stringify(credentials)
        })

        if (res.ok) {
          toast.success(t('accounts.credentialsImportedSuccessfully'))
          return { success: true }
        } else {
          const error = await res.json()
          toast.error(t('accounts.failedToImportCredentials') + ': ' + (error.error || t('accounts.unknownError')))
          return { success: false }
        }
      } else {
        const res = await fetch('/admin/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          },
          body: JSON.stringify(accountData)
        })
        if (res.ok) {
          toast.success(t('accounts.accountAdded'))
          return { success: true }
        } else {
          toast.error(t('accounts.failedToAddAccount'))
          return { success: false }
        }
      }
    } catch (e) {
      toast.error(t('accounts.failedToAddAccount') + ': ' + e.message)
      return { success: false }
    }
  }

  async function updateAccount(id, payload) {
    try {
      const res = await fetch(`/admin/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.success(t('accounts.accountUpdated'))
        return { success: true }
      } else {
        toast.error(t('accounts.failedToUpdateAccount'))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToUpdateAccount') + ': ' + e.message)
      return { success: false }
    }
  }

  async function deleteAccount(id) {
    const confirmed = await confirm({
      title: t('accounts.deleteConfirmTitle'),
      message: t('accounts.deleteConfirmMessage'),
      type: 'danger',
      confirmText: t('common.delete'),
      cancelText: t('common.cancel')
    })
    if (!confirmed) return { success: false }

    try {
      await fetch(`/admin/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': password }
      })
      toast.success(t('accounts.accountDeleted'))
      return { success: true }
    } catch (e) {
      toast.error(t('accounts.failedToDeleteAccount'))
      return { success: false }
    }
  }

  async function refreshAccount(id) {
    try {
      await fetch(`/admin/api/accounts/${id}/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      toast.success(t('accounts.accountRefreshedSuccessfully'))
      return { success: true }
    } catch (e) {
      toast.error(t('accounts.failedToRefreshAccount'))
      return { success: false }
    }
  }

  async function testAccount(id) {
    testingAccounts.value.add(id)
    try {
      const res = await fetch(`/admin/api/accounts/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ model: 'claude-sonnet-4' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`${t('accounts.testSuccessful')} Model: ${data.model}`, t('accounts.accountTest'))
        return { success: true }
      } else {
        toast.error(data.error || t('accounts.unknownError'), t('accounts.testFailed'))
        return { success: false }
      }
    } catch (e) {
      toast.error(e.message, t('accounts.testFailed'))
      return { success: false }
    } finally {
      testingAccounts.value.delete(id)
    }
  }

  async function toggleAccountStatus(acc) {
    try {
      const res = await fetch(`/admin/api/accounts/${acc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled: !acc.enabled })
      })
      if (res.ok) {
        toast.success(t(!acc.enabled ? 'accounts.enabled' : 'accounts.disabled'))
        return { success: true }
      } else {
        toast.error(t('accounts.failedToUpdateAccountStatus'))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToUpdateAccountStatus'))
      return { success: false }
    }
  }

  async function batchOperation(accountIds, action) {
    try {
      const res = await fetch('/admin/api/accounts/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          ids: accountIds,
          action: action
        })
      })
      if (res.ok) {
        const messages = {
          enable: t('accounts.accountsEnabledSuccessfully'),
          disable: t('accounts.accountsDisabledSuccessfully'),
          delete: t('accounts.accountsDeletedSuccessfully')
        }
        toast.success(messages[action] || t('accounts.operationSuccessful'))
        return { success: true }
      } else {
        toast.error(t('accounts.failedToUpdateAccountStatus'))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToUpdateAccountStatus'))
      return { success: false }
    }
  }

  async function batchTest(accountIds) {
    batchTesting.value = true
    let successCount = 0
    let failCount = 0

    try {
      const promises = accountIds.map(async (id) => {
        testingAccounts.value.add(id)
        try {
          const res = await fetch(`/admin/api/accounts/${id}/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Password': password
            },
            body: JSON.stringify({ model: 'claude-sonnet-4' })
          })
          const data = await res.json()
          if (res.ok && data.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (e) {
          failCount++
        } finally {
          testingAccounts.value.delete(id)
        }
      })

      await Promise.all(promises)

      if (successCount > 0 && failCount === 0) {
        toast.success(t('accounts.allAccountsTestedSuccessfully', { count: successCount }), t('accounts.batchTestComplete'))
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(t('accounts.batchTestPartialSuccess', { success: successCount, failed: failCount }), t('accounts.batchTestComplete'))
      } else {
        toast.error(t('accounts.allAccountsFailed', { count: failCount }), t('accounts.testFailed'))
      }
      return { success: true, successCount, failCount }
    } catch (e) {
      toast.error(t('accounts.batchTestFailed') + ': ' + e.message)
      return { success: false }
    } finally {
      batchTesting.value = false
    }
  }

  async function exportAccounts() {
    try {
      const res = await fetch('/admin/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        }
      })
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kiro-accounts-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(t('accounts.accountsExported'))
        return { success: true }
      } else {
        toast.error(t('accounts.failedToExportAccounts'))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToExportAccounts') + ': ' + e.message)
      return { success: false }
    }
  }

  async function refreshAllAccounts(accounts) {
    loading.value = true
    try {
      const promises = accounts.map(acc =>
        fetch(`/admin/api/accounts/${acc.id}/refresh`, {
          method: 'POST',
          headers: { 'X-Admin-Password': password }
        })
      )
      await Promise.all(promises)
      toast.success(t('accounts.accountsRefreshed'))
      return { success: true }
    } catch (e) {
      toast.error(t('accounts.failedToRefreshAccounts'))
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    testingAccounts,
    batchTesting,
    loadAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    refreshAccount,
    testAccount,
    toggleAccountStatus,
    batchOperation,
    batchTest,
    exportAccounts,
    refreshAllAccounts
  }
}
