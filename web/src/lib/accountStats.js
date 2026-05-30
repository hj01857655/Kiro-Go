// 账号统计计算工具函数

// 智能格式化使用量：整数显示整数，小数保留2位（去掉末尾0）
export const formatUsage = (value) => {
  if (value == null) return '0'
  if (Number.isInteger(value)) return value.toString()
  return parseFloat(value.toFixed(2)).toString()
}

// 从 account 获取 breakdown（API 返回 camelCase）
export const getBreakdown = (account) => {
  return account.usageData?.usageBreakdownList?.[0] || null
}

// 获取总配额（主配额 + 未过期的试用 + 未过期的奖励）
export const getQuota = (account) => {
  const breakdown = getBreakdown(account)
  if (!breakdown) return 0

  const now = Date.now()
  const main = breakdown.usageLimitWithPrecision ?? breakdown.usageLimit ?? 0

  // 检查试用是否激活（只看状态，不看日期）
  const trialInfo = breakdown.freeTrialInfo
  const trialActive = trialInfo?.freeTrialStatus === 'ACTIVE'
  const freeTrial = trialActive ? (trialInfo?.usageLimit ?? 0) : 0

  // 检查每个奖励配额（只计入未过期且状态为 ACTIVE 的奖励）
  const bonuses = Array.isArray(breakdown.bonuses) ? breakdown.bonuses : []
  let bonus = 0
  bonuses.forEach(b => {
    const expiry = b.expiresAt ? b.expiresAt * 1000 : Infinity
    if (expiry > now && b.status === 'ACTIVE') {
      bonus += b.usageLimit ?? 0
    }
  })

  return main + freeTrial + bonus
}

// 获取已使用量（主配额 + 未过期的试用 + 未过期的奖励）
export const getUsed = (account) => {
  const breakdown = getBreakdown(account)
  if (!breakdown) return 0

  const now = Date.now()
  const main = breakdown.currentUsageWithPrecision ?? breakdown.currentUsage ?? 0

  // 检查试用是否激活（只看状态，不看日期）
  const trialInfo = breakdown.freeTrialInfo
  const trialActive = trialInfo?.freeTrialStatus === 'ACTIVE'
  const freeTrial = trialActive ? (trialInfo?.currentUsage ?? 0) : 0

  // 检查每个奖励配额（只计入未过期且状态为 ACTIVE 的奖励）
  const bonuses = Array.isArray(breakdown.bonuses) ? breakdown.bonuses : []
  let bonus = 0
  bonuses.forEach(b => {
    const expiry = b.expiresAt ? b.expiresAt * 1000 : Infinity
    if (expiry > now && b.status === 'ACTIVE') {
      bonus += b.currentUsage ?? 0
    }
  })

  return main + freeTrial + bonus
}

// 获取订阅类型
export const getSubType = (account) =>
  account.usageData?.subscriptionInfo?.type ?? ''

// 获取订阅计划名称
export const getSubPlan = (account) =>
  account.usageData?.subscriptionInfo?.subscriptionTitle ?? ''

// 获取使用百分比
export const getUsagePercent = (account) => {
  const quota = getQuota(account)
  const used = getUsed(account)
  return quota === 0 ? 0 : Math.min(100, (used / quota) * 100)
}

// 检查是否有超额使用
export const hasOverage = (account) => {
  const breakdown = getBreakdown(account)
  return (breakdown?.currentOveragesWithPrecision ?? breakdown?.currentOverages ?? 0) > 0
}

// 检查超额功能是否开启
export const isOverageEnabled = (account) => {
  return account.usageData?.overageConfiguration?.overageStatus === 'ENABLED' &&
         account.usageData?.subscriptionInfo?.overageCapability === 'OVERAGE_CAPABLE'
}

// 获取超额使用量
export const getOverageUsed = (account) => {
  const breakdown = getBreakdown(account)
  return breakdown?.currentOveragesWithPrecision ?? breakdown?.currentOverages ?? 0
}

// 获取超额上限
export const getOverageCap = (account) => {
  const breakdown = getBreakdown(account)
  return breakdown?.overageCapWithPrecision ?? breakdown?.overageCap ?? 0
}

// 获取超额费用
export const getOverageCharges = (account) => {
  const breakdown = getBreakdown(account)
  return breakdown?.overageCharges ?? 0
}

// 获取超额费率
export const getOverageRate = (account) => {
  const breakdown = getBreakdown(account)
  return breakdown?.overageRate ?? 0
}
