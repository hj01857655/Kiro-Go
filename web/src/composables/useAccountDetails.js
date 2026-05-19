import { ref } from 'vue'

export function useAccountDetails(password, toast, t) {
  const loadingDetails = ref(false)
  const accountDetails = ref(null)
  const accountModels = ref([])
  const refreshingModels = ref(false)
  const currentAccountId = ref(null)

  async function loadAccountDetails(accountId) {
    currentAccountId.value = accountId
    loadingDetails.value = true
    accountDetails.value = null
    accountModels.value = []

    try {
      // Load full account details
      const res = await fetch(`/admin/api/accounts/${accountId}/full`, {
        headers: { 'X-Admin-Password': password }
      })

      if (res.ok) {
        accountDetails.value = await res.json()
      } else {
        toast.error(t('accounts.failedToLoadAccountDetails'))
        return { success: false }
      }

      // Load cached models
      const modelsRes = await fetch(`/admin/api/accounts/${accountId}/models/cached`, {
        headers: { 'X-Admin-Password': password }
      })

      if (modelsRes.ok) {
        const data = await modelsRes.json()
        accountModels.value = data.models || []
      }

      return { success: true }
    } catch (e) {
      toast.error(t('accounts.failedToLoadAccountDetails') + ': ' + e.message)
      return { success: false }
    } finally {
      loadingDetails.value = false
    }
  }

  async function refreshModels() {
    if (!currentAccountId.value) return { success: false }

    refreshingModels.value = true
    try {
      const res = await fetch(`/admin/api/accounts/${currentAccountId.value}/models/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })

      if (res.ok) {
        const data = await res.json()
        accountModels.value = data.models || []
        toast.success(t('accounts.modelsRefreshedSuccessfully'))
        return { success: true }
      } else {
        toast.error(t('accounts.failedToRefreshModels'))
        return { success: false }
      }
    } catch (e) {
      toast.error(t('accounts.failedToRefreshModels') + ': ' + e.message)
      return { success: false }
    } finally {
      refreshingModels.value = false
    }
  }

  return {
    loadingDetails,
    accountDetails,
    accountModels,
    refreshingModels,
    currentAccountId,
    loadAccountDetails,
    refreshModels
  }
}
