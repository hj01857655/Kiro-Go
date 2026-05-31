import { useState, useEffect } from 'react'
import { parseUpstreamDate } from '../lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Switch } from './ui/switch'
import { useNotification } from './ui/notification'
import {
  User, Mail, Key, Globe, Activity, Calendar,
  TrendingUp, Shield, Server, Hash, DollarSign,
  AlertCircle, CheckCircle2, Clock, Zap, RefreshCw, Loader2
} from 'lucide-react'

export default function AccountDetailModal({ open, onOpenChange, account, password, onRefresh }) {
  const notify = useNotification()
  const [overageLoading, setOverageLoading] = useState(false)

  // 模型列表来自 pool 的运行时缓存（GET /models/cached），不是 account.availableModels
  // —— 后端 /full 接口并不返回该字段，旧代码读它永远为空。
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsRefreshing, setModelsRefreshing] = useState(false)

  // 打开弹窗（或切换账号）时拉取已缓存的模型列表
  useEffect(() => {
    if (!open || !account?.id) return
    let cancelled = false
    setModelsLoading(true)
    fetch(`/admin/api/accounts/${account.id}/models/cached`, {
      headers: { 'X-Admin-Password': password }
    })
      .then(res => res.ok ? res.json() : { models: [] })
      .then(data => { if (!cancelled) setModels(Array.isArray(data.models) ? data.models : []) })
      .catch(() => { if (!cancelled) setModels([]) })
      .finally(() => { if (!cancelled) setModelsLoading(false) })
    return () => { cancelled = true }
  }, [open, account?.id, password])

  const refreshModels = async () => {
    if (!account?.id) return
    setModelsRefreshing(true)
    try {
      const res = await fetch(`/admin/api/accounts/${account.id}/models/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      // 刷新成功后立即重新拉取缓存，就地回显最新模型
      const cachedRes = await fetch(`/admin/api/accounts/${account.id}/models/cached`, {
        headers: { 'X-Admin-Password': password }
      })
      const cached = await cachedRes.json().catch(() => ({ models: [] }))
      const list = Array.isArray(cached.models) ? cached.models : []
      setModels(list)
      notify.success(`已刷新 ${list.length} 个模型`)
    } catch (e) {
      notify.error('刷新模型失败: ' + e.message)
    } finally {
      setModelsRefreshing(false)
    }
  }

  if (!account) return null

  const handleOverageToggle = async (enabled) => {
    setOverageLoading(true)
    try {
      const res = await fetch(`/admin/api/accounts/${account.id}/overage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled })
      })

      if (res.ok) {
        notify.success(enabled ? '超额计费已启用' : '超额计费已关闭')
        if (onRefresh) onRefresh()
      } else {
        const data = await res.json()
        notify.error(data.error || '操作失败')
      }
    } catch (e) {
      notify.error('操作失败')
    } finally {
      setOverageLoading(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '从未'
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  const InfoItem = ({ icon: Icon, label, value, className = '' }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-sm font-mono break-all text-foreground ${className}`}>{value || '-'}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] glass border-2 border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-white" />
            </div>
            账户详情
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">{account.email}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
              <User className="w-4 h-4" />
              基本信息
            </h3>
            <div className="space-y-1 bg-gradient-to-br from-muted/50 to-muted/30 rounded-md p-4 border-2 border-border">
              <InfoItem icon={Hash} label="账户 ID" value={account.id} />
              <InfoItem icon={User} label="昵称" value={account.nickname} />
              <InfoItem icon={Mail} label="邮箱" value={account.email} />
              <InfoItem icon={Hash} label="用户 ID" value={account.userId} />
              <div className="flex items-start gap-3 py-2">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">状态</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={account.enabled ? 'default' : 'secondary'} className="border-2">
                      {account.enabled ? '已启用' : '已禁用'}
                    </Badge>
                    {account.usageData?.subscriptionInfo?.type && (
                      <Badge variant="outline" className="border-2">{account.usageData.subscriptionInfo.type}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 认证信息 */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Key className="w-4 h-4" />
              认证信息
            </h3>
            <div className="space-y-1 bg-gradient-to-br from-muted/50 to-muted/30 rounded-md p-4 border-2 border-border">
              <InfoItem icon={Shield} label="认证方式" value={account.authMethod} />
              <InfoItem icon={Server} label="提供商" value={account.provider} />
              <InfoItem icon={Globe} label="区域" value={account.region} />
              <InfoItem icon={Hash} label="Machine ID" value={account.machineId} />
            </div>
          </div>

          <Separator />

          {/* 订阅信息 */}
          {account.usageData?.subscriptionInfo && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <Zap className="w-4 h-4" />
                  订阅信息
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-md p-4 border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-gradient">
                        {account.usageData.subscriptionInfo.subscriptionTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.usageData.subscriptionInfo.type}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {account.usageData.subscriptionInfo.upgradeCapability === 'UPGRADE_CAPABLE' && (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700">
                          可升级
                        </Badge>
                      )}
                      {account.usageData.subscriptionInfo.overageCapability === 'OVERAGE_CAPABLE' && (
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700">
                          支持超额
                        </Badge>
                      )}
                    </div>
                  </div>
                  {account.usageData.overageConfiguration && account.usageData.subscriptionInfo?.overageCapability === 'OVERAGE_CAPABLE' && (
                    <div className="flex items-center gap-2 text-sm">
                      {account.usageData.overageConfiguration.overageStatus === 'ENABLED' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400 font-medium">超额计费已启用</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">超额计费未启用</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 用量明细 */}
          {account.usageData?.usageBreakdownList && account.usageData.usageBreakdownList.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4" />
                  用量明细
                </h3>
                <div className="space-y-4">
                  {account.usageData.usageBreakdownList.map((usage, idx) => {
                    const percentage = (usage.currentUsageWithPrecision / usage.usageLimitWithPrecision) * 100
                    const isHigh = percentage > 80
                    const isCritical = percentage > 90

                    return (
                      <div key={idx} className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-md p-4 space-y-3 border-2 border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-md flex items-center justify-center shadow-sm ${
                              isCritical ? 'bg-red-100 dark:bg-red-900/30' :
                              isHigh ? 'bg-orange-100 dark:bg-orange-900/30' :
                              'bg-purple-100 dark:bg-purple-900/30'
                            }`}>
                              <Activity className={`w-5 h-5 ${
                                isCritical ? 'text-red-600 dark:text-red-400' :
                                isHigh ? 'text-orange-600 dark:text-orange-400' :
                                'text-purple-600 dark:text-purple-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {usage.displayName || usage.resourceType}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {usage.displayNamePlural}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              isCritical ? 'text-red-600 dark:text-red-400' :
                              isHigh ? 'text-orange-600 dark:text-orange-400' :
                              'text-foreground'
                            }`}>
                              {usage.currentUsageWithPrecision?.toFixed(2) || usage.currentUsage}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              / {usage.usageLimitWithPrecision?.toFixed(0) || usage.usageLimit} {usage.unit?.toLowerCase()}
                            </p>
                          </div>
                        </div>

                        <div className="relative h-3 bg-muted rounded-full overflow-hidden border border-border">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCritical
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : isHigh
                                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">重置时间</p>
                              <p className="font-medium text-foreground">
                                {(() => {
                                  const d = parseUpstreamDate(usage.nextDateReset)
                                  return d ? d.toLocaleDateString('zh-CN') : '-'
                                })()}
                              </p>
                            </div>
                          </div>
                          {usage.currency && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">货币</p>
                                <p className="font-medium text-foreground">{usage.currency}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {usage.overageRate > 0 && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">超额费率</span>
                              <span className="font-semibold text-foreground">
                                {usage.currency} {usage.overageRate} / {usage.unit?.toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">超额上限</span>
                              <span className="font-semibold text-foreground">
                                {usage.overageCapWithPrecision?.toFixed(0) || usage.overageCap} {usage.unit?.toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">当前超额</span>
                              <span className={`font-semibold ${
                                (usage.currentOveragesWithPrecision || usage.currentOverages) > 0
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-muted-foreground'
                              }`}>
                                {(usage.currentOveragesWithPrecision || usage.currentOverages)?.toFixed(2) || '0.00'} / {usage.overageCapWithPrecision?.toFixed(0) || usage.overageCap}
                              </span>
                            </div>
                            {usage.overageCharges > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">超额费用</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {usage.currency} {usage.overageCharges.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {(usage.currentOveragesWithPrecision || usage.currentOverages) > 0 && (
                              <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-orange-600 dark:text-orange-400">超额使用进度</span>
                                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                                    {(((usage.currentOveragesWithPrecision || usage.currentOverages) / (usage.overageCapWithPrecision || usage.overageCap)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                                    style={{
                                      width: `${Math.min(((usage.currentOveragesWithPrecision || usage.currentOverages) / (usage.overageCapWithPrecision || usage.overageCap)) * 100, 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 免费试用信息 */}
                        {usage.freeTrialInfo && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">免费试用</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">试用状态</span>
                              <span className="font-semibold text-foreground">{usage.freeTrialInfo.freeTrialStatus}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">试用额度</span>
                              <span className="font-semibold text-foreground">
                                {usage.freeTrialInfo.currentUsage.toFixed(2)} / {usage.freeTrialInfo.usageLimit.toFixed(0)}
                              </span>
                            </div>
                            {usage.freeTrialInfo.freeTrialExpiry && (() => {
                              const d = parseUpstreamDate(usage.freeTrialInfo.freeTrialExpiry)
                              return d ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">试用到期</span>
                                  <span className="font-semibold text-foreground">
                                    {d.toLocaleDateString('zh-CN')}
                                  </span>
                                </div>
                              ) : null
                            })()}
                          </div>
                        )}

                        {/* 奖励信息 */}
                        {usage.bonuses && usage.bonuses.length > 0 && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400">奖励额度</p>
                            {usage.bonuses.map((bonus, bonusIdx) => (
                              <div key={bonusIdx} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-foreground">{bonus.displayName}</span>
                                  <Badge variant="outline" className="text-xs">{bonus.status}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>代码: {bonus.bonusCode}</span>
                                  <span>{bonus.currentUsage.toFixed(2)} / {bonus.usageLimit.toFixed(0)}</span>
                                </div>
                                {bonus.expiresAt && (
                                  <div className="text-xs text-muted-foreground">
                                    到期: {new Date(Number(bonus.expiresAt) * 1000).toLocaleDateString('zh-CN')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* 用户信息 */}
          {account.usageData?.userInfo && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4" />
                  用户信息
                </h3>
                <div className="space-y-1 bg-gradient-to-br from-muted/50 to-muted/30 rounded-md p-4 border border-border/50">
                  <div className="flex items-start gap-3 py-2">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">邮箱</p>
                      <p className="text-sm font-mono break-all text-foreground">{account.usageData.userInfo.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-2">
                    <Hash className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">用户 ID</p>
                      <p className="text-sm font-mono break-all text-foreground">{account.usageData.userInfo.userId || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 使用统计 */}
          <Separator />
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-foreground">
              <Activity className="w-4 h-4" />
              使用统计
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-md p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">请求次数</span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{account.requestCount || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-md p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300">错误次数</span>
                </div>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{account.errorCount || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-md p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">最后使用</span>
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{formatDate(account.lastUsed)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-md p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">最后刷新</span>
                </div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">{formatDate(account.lastRefresh)}</p>
              </div>
            </div>
          </div>

          {/* 可用模型（来自 pool 运行时缓存，可手动刷新） */}
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Server className="w-4 h-4" />
                  可用模型
                  {models.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">{models.length}</Badge>
                  )}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshModels}
                  disabled={modelsRefreshing}
                  className="border-2 border-border hover:border-purple-500 dark:hover:border-purple-400"
                >
                  {modelsRefreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  刷新模型
                </Button>
              </div>
              {modelsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </div>
              ) : models.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {models.map((model) => (
                    <Badge key={model} variant="outline" className="font-mono text-xs px-3 py-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  暂无缓存的模型列表，点击「刷新模型」拉取
                </p>
              )}
            </div>
          </>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
