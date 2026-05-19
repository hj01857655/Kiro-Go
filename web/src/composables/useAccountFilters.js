import { ref, computed } from 'vue'

export function useAccountFilters(accounts) {
  const searchQuery = ref('')
  const filterType = ref('all')
  const filterStatus = ref('all')
  const sortBy = ref('email')

  const filteredAccounts = computed(() => {
    let result = accounts.value

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(acc =>
        acc.email?.toLowerCase().includes(query) ||
        acc.nickname?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (filterType.value !== 'all') {
      result = result.filter(acc =>
        (acc.subscriptionType?.toLowerCase() || 'free') === filterType.value
      )
    }

    // Status filter
    if (filterStatus.value !== 'all') {
      result = result.filter(acc =>
        filterStatus.value === 'enabled' ? acc.enabled : !acc.enabled
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy.value) {
        case 'email':
          return (a.email || '').localeCompare(b.email || '')
        case 'usage':
          return (b.usageCurrent || 0) - (a.usageCurrent || 0)
        case 'type':
          return (a.subscriptionType || '').localeCompare(b.subscriptionType || '')
        case 'status':
          return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0)
        default:
          return 0
      }
    })

    return result
  })

  const enabledCount = computed(() =>
    accounts.value.filter(acc => acc.enabled).length
  )

  const disabledCount = computed(() =>
    accounts.value.filter(acc => !acc.enabled).length
  )

  const proCount = computed(() =>
    accounts.value.filter(acc =>
      ['pro', 'pro_plus', 'power'].includes(acc.subscriptionType?.toLowerCase())
    ).length
  )

  return {
    searchQuery,
    filterType,
    filterStatus,
    sortBy,
    filteredAccounts,
    enabledCount,
    disabledCount,
    proCount
  }
}
