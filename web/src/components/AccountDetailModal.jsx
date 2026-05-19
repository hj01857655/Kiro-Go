import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import {
  User, Mail, Key, Globe, Activity, Calendar,
  TrendingUp, Shield, Server, Hash, DollarSign,
  AlertCircle, CheckCircle2, Clock, Zap
} from 'lucide-react'

export default function AccountDetailModal({ open, onOpenChange, account }) {
  if (!account) return null

  const formatDate = (timestamp) => {
    if (!timestamp) return '从未'
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  const InfoItem = ({ icon: Icon, label, value, className = '' }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-sm font-mono break-all ${className}`}>{value || '-'}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] glass border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            账户详情
          </DialogTitle>
          <DialogDescription className="text-base">{account.email}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              基本信息
            </h3>
            <div className="space-y-1 bg-muted/50 rounded-lg p-4">
              <InfoItem icon={Hash} label="账户 ID" value={account.id} />
              <InfoItem icon={User} label="昵称" value={account.nickname} />
              <InfoItem icon={Mail} label="邮箱" value={account.email} />
              <InfoItem icon={Hash} label="用户 ID" value={account.userId} />
              <div className="flex items-start gap-3 py-2">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">状态</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={account.enabled ? 'default' : 'secondary'}>
                      {account.enabled ? '已启用' : '已禁用'}
                    </Badge>
                    {account.usageData?.subscriptionInfo?.type && (
                      <Badge variant="outline">{account.usageData.subscriptionInfo.type}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 认证信息 */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" />
              认证信息
            </h3>
            <div className="space-y-1 bg-muted/50 rounded-lg p-4">
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
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  订阅信息
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
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
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                          可升级
                        </Badge>
                      )}
                      {account.usageData.subscriptionInfo.overageCapability === 'OVERAGE_CAPABLE' && (
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                          支持超额
                        </Badge>
                      )}
                    </div>
                  </div>
                  {account.usageData.overageConfiguration && (
                    <div className="flex items-center gap-2 text-sm">
                      {account.usageData.overageConfiguration.overageStatus === 'ENABLED' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400 font-medium">超额计费已启用</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">超额计费未启用</span>
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
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  用量明细
                </h3>
                <div className="space-y-4">
                  {account.usageData.usageBreakdownList.map((usage, idx) => {
                    const percentage = (usage.currentUsageWithPrecision / usage.usageLimitWithPrecision) * 100
                    const isHigh = percentage > 80
                    const isCritical = percentage > 90

                    return (
                      <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
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
                              <p className="font-semibold">
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

                        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                              <p className="font-medium">
                                {usage.nextDateReset ? new Date(usage.nextDateReset * 1000).toLocaleDateString('zh-CN') : '-'}
                              </p>
                            </div>
                          </div>
                          {usage.currency && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">货币</p>
                                <p className="font-medium">{usage.currency}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {usage.overageRate > 0 && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">超额费率</span>
                              <span className="font-semibold">
                                {usage.currency} {usage.overageRate} / {usage.unit?.toLowerCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">超额上限</span>
                              <span className="font-semibold">
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
                                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* 使用统计 */}
          <Separator />
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              使用统计
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-muted-foreground">请求次数</span>
                </div>
                <p className="text-2xl font-bold">{account.requestCount || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-muted-foreground">错误次数</span>
                </div>
                <p className="text-2xl font-bold">{account.errorCount || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-muted-foreground">最后使用</span>
                </div>
                <p className="text-sm font-medium">{formatDate(account.lastUsed)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-muted-foreground">最后刷新</span>
                </div>
                <p className="text-sm font-medium">{formatDate(account.lastRefresh)}</p>
              </div>
            </div>
          </div>

          {/* 可用模型 */}
          {account.availableModels && account.availableModels.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  可用模型
                </h3>
                <div className="flex flex-wrap gap-2">
                  {account.availableModels.map((model) => (
                    <Badge key={model} variant="outline" className="font-mono text-xs px-3 py-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
