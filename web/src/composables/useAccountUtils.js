export function useAccountUtils(t) {
  function getUsagePercent(acc) {
    if (!acc.usageLimit || acc.usageLimit === 0) return 0
    return Math.min(100, (acc.usageCurrent / acc.usageLimit) * 100)
  }

  function getBadgeClass(acc) {
    const type = (acc.subscriptionType?.toLowerCase() || 'free').replace(/_/g, '-')
    return `badge-${type}`
  }

  function getUsageColorClass(acc) {
    const percent = getUsagePercent(acc)
    if (percent >= 90) return 'text-error'
    if (percent >= 70) return 'text-warning'
    return 'text-success'
  }

  function getUsageProgressClass(acc) {
    const percent = getUsagePercent(acc)
    if (percent >= 90) return 'usage-high'
    if (percent >= 70) return 'usage-medium'
    return 'usage-low'
  }

  function getAuthMethodLabel(authMethod) {
    const labels = {
      'manual': 'Manual Token',
      'iam-sso': 'IAM SSO',
      'builderid': 'Builder ID',
      'idc': 'IAM SSO',
      'social': 'Social',
      'sso-token': 'SSO Token',
      'credentials': 'Credentials'
    }
    return labels[authMethod] || authMethod || 'N/A'
  }

  function formatLastRefresh(timestamp) {
    if (!timestamp) return t('accounts.never')
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  function accountSupportsOverage(acc) {
    if (!acc.usageData) return false
    try {
      const data = JSON.parse(acc.usageData)
      return data.subscriptionInfo?.overageCapability === 'OVERAGE_CAPABLE'
    } catch {
      return false
    }
  }

  function accountOverageEnabled(acc) {
    if (!acc.usageData) return false
    try {
      const data = JSON.parse(acc.usageData)
      return data.overageConfiguration?.overageStatus === 'ENABLED'
    } catch {
      return false
    }
  }

  return {
    getUsagePercent,
    getBadgeClass,
    getUsageColorClass,
    getUsageProgressClass,
    getAuthMethodLabel,
    formatLastRefresh,
    accountSupportsOverage,
    accountOverageEnabled
  }
}
