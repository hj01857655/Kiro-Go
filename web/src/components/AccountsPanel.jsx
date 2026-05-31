import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import {
  RefreshCw, Trash2, Power, Plus, Search,
  Eye, Loader2, Activity, Download, Upload,
  Check, X, Copy, Mail, Clock, ChevronDown, ChevronUp,
  CheckCircle2, TrendingUp, Server
} from 'lucide-react'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { exportToJSON, exportToCSV, copyToClipboard, parseUpstreamDate } from '../lib/utils'
import ImportAccountsModal from './ImportAccountsModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  getQuota,
  getUsed,
  getUsagePercent,
  getSubType,
  getSubPlan,
  formatUsage,
  hasOverage,
  isOverageEnabled,
  getOverageUsed,
  getOverageCap,
  getOverageCharges,
  getOverageRate,
  getBreakdown
} from '../lib/accountStats'

export default function AccountsPanel({
  accounts,
  loading,
  searchTerm,
  onSearchChange,
  onRefresh,
  onAdd,
  onToggle,
  onRefreshAccount,
  onDelete,
  onShowDetail,
  onBatchEnable,
  onBatchDisable,
  onBatchDelete,
  searchInputRef,
  selectedAccounts = [],
  onSelectedAccountsChange,
  password
}) {
  const { t } = useTranslation()
  const notify = useNotification()
  const [actionLoading, setActionLoading] = useState({})
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('lastUsed')
  const [expandedCards, setExpandedCards] = useState({}) // 记录哪些卡片展开了用量详情
  const [overageLoading, setOverageLoading] = useState({})
  const [showImportModal, setShowImportModal] = useState(false)
  const [refreshingModels, setRefreshingModels] = useState(false)

  // 为所有已启用账号刷新模型路由缓存（后端单次调用 /accounts/models/refresh）
  const handleRefreshAllModels = async () => {
    setRefreshingModels(true)
    try {
      const res = await fetch('/admin/api/accounts/models/refresh', {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({}))
      notify.success(t('accounts.refreshModelsSuccess', { count: data.refreshed ?? 0 }))
    } catch (e) {
      notify.error(t('accounts.refreshModelsError') + ': ' + e.message)
    } finally {
      setRefreshingModels(false)
    }
  }

  const toggleCardExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleOverageToggle = async (accountId, enabled) => {
    setOverageLoading(prev => ({ ...prev, [accountId]: true }))
    try {
      const res = await fetch(`/admin/api/accounts/${accountId}/overage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled })
      })

      if (res.ok) {
        notify.success(enabled ? t('accounts.overage.enabled') : t('accounts.overage.disabled'))
        onRefresh()
      } else {
        const data = await res.json()
        notify.error(data.error || t('common.error'))
      }
    } catch (e) {
      notify.error(t('common.error'))
    } finally {
      setOverageLoading(prev => ({ ...prev, [accountId]: false }))
    }
  }

  const selectedIds = selectedAccounts
  const setSelectedIds = onSelectedAccountsChange || (() => {})

  const handleAction = async (id, actionType, action) => {
    setActionLoading(prev => ({ ...prev, [id]: actionType }))
    await action()
    setActionLoading(prev => ({ ...prev, [id]: null }))
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAccounts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredAccounts.map(a => a.id))
    }
  }

  const handleBatchAction = async (action) => {
    if (selectedIds.length === 0) return
    await action(selectedIds)
    setSelectedIds([])
  }

  const handleExportJSON = () => {
    const exportData = filteredAccounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      nickname: acc.nickname,
      enabled: acc.enabled,
      subscriptionType: getSubType(acc),
      authMethod: acc.authMethod,
      provider: acc.provider,
      requestCount: acc.requestCount,
      lastUsed: acc.lastUsed
    }))
    exportToJSON(exportData, `accounts-${new Date().toISOString().split('T')[0]}.json`)
    notify.success(t('accounts.export.jsonSuccess'))
  }

  const handleExportCSV = () => {
    const exportData = filteredAccounts.map(acc => ({
      ID: acc.id,
      [t('accounts.fields.email')]: acc.email,
      [t('accounts.fields.nickname')]: acc.nickname || '',
      [t('accounts.fields.status')]: acc.enabled ? t('common.enabled') : t('common.disabled'),
      [t('accounts.fields.subscription')]: getSubType(acc) || 'Free',
      [t('accounts.fields.authMethod')]: acc.authMethod === 'idc' ? 'IdC' : 'Social',
      [t('accounts.fields.provider')]: acc.provider || '',
      [t('accounts.fields.requests')]: acc.requestCount || 0,
      [t('accounts.fields.lastUsed')]: acc.lastUsed ? new Date(acc.lastUsed * 1000).toLocaleString('zh-CN') : t('accounts.never')
    }))
    exportToCSV(exportData, `accounts-${new Date().toISOString().split('T')[0]}.csv`)
    notify.success(t('accounts.export.csvSuccess'))
  }

  const handleCopyId = (id) => {
    copyToClipboard(id)
      .then(() => notify.success(t('accounts.copyIdSuccess')))
      .catch(() => notify.error(t('accounts.copyIdError')))
  }

  let filteredAccounts = accounts.filter(acc => {
    const matchesSearch = !searchTerm ||
      acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.id?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'enabled' && acc.enabled) ||
      (filterStatus === 'disabled' && !acc.enabled) ||
      (filterStatus === 'free' && (!acc.usageData?.subscriptionInfo?.type || acc.usageData?.subscriptionInfo?.type === 'FREE')) ||
      (filterStatus === 'pro' && acc.usageData?.subscriptionInfo?.type?.toUpperCase().includes('PRO')) ||
      (filterStatus === 'idc' && acc.authMethod === 'idc') ||
      (filterStatus === 'social' && acc.authMethod === 'social') ||
      (filterStatus === 'high-usage' && getUsagePercent(acc) > 80) ||
      (filterStatus === 'overage' && hasOverage(acc)) ||
      (filterStatus === 'banned' && !!acc.banStatus && acc.banStatus !== 'NONE')

    return matchesSearch && matchesFilter
  })

  // 排序
  filteredAccounts = [...filteredAccounts].sort((a, b) => {
    switch (sortBy) {
      case 'lastUsed':
        return (b.lastUsed || 0) - (a.lastUsed || 0)
      case 'email':
        return (a.email || '').localeCompare(b.email || '')
      case 'requests':
        return (b.requestCount || 0) - (a.requestCount || 0)
      case 'usage':
        const aUsage = getUsagePercent(a)
        const bUsage = getUsagePercent(b)
        return bUsage - aUsage
      default:
        return 0
    }
  })

  const getSubBadge = (type) => {
    const badges = {
      'Free': { variant: 'secondary', label: 'Free' },
      'Pro': { variant: 'default', label: 'Pro' },
      'Pro_Plus': { variant: 'default', label: 'Pro+' },
      'Power': { variant: 'default', label: 'Power' }
    }
    return badges[type] || badges['Free']
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return t('accounts.never')
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 导入模态框 */}
      <ImportAccountsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        password={password}
        onSuccess={onRefresh}
      />

      {/* 操作栏 */}
      <Card className="border-0 shadow-md glass">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder={t('accounts.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 w-full border-2 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] border-2">
                    <SelectValue placeholder={t('common.filter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('accounts.filters.all')}</SelectItem>
                    <SelectItem value="enabled">{t('accounts.filters.enabled')}</SelectItem>
                    <SelectItem value="disabled">{t('accounts.filters.disabled')}</SelectItem>
                    <SelectItem value="free">{t('accounts.filters.free')}</SelectItem>
                    <SelectItem value="pro">{t('accounts.filters.pro')}</SelectItem>
                    <SelectItem value="idc">{t('accounts.filters.idc')}</SelectItem>
                    <SelectItem value="social">{t('accounts.filters.social')}</SelectItem>
                    <SelectItem value="high-usage">{t('accounts.filters.highUsage')}</SelectItem>
                    <SelectItem value="overage">{t('accounts.filters.overage')}</SelectItem>
                    <SelectItem value="banned">{t('accounts.filters.banned')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] border-2">
                    <SelectValue placeholder={t('accounts.sort.label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastUsed">{t('accounts.sort.lastUsed')}</SelectItem>
                    <SelectItem value="email">{t('accounts.sort.email')}</SelectItem>
                    <SelectItem value="requests">{t('accounts.sort.requests')}</SelectItem>
                    <SelectItem value="usage">{t('accounts.sort.usage')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="border-2 border-border"
                >
                  <Upload className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('accounts.import')}</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-2 border-border">
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('common.export')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass">
                    <DropdownMenuLabel>{t('accounts.export.label')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportJSON}>
                      {t('accounts.export.json')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      {t('accounts.export.csv')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={onRefresh} variant="outline" disabled={loading} className="border-2 border-border btn-scale">
                  <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{t('accounts.refresh')}</span>
                </Button>
                <Button onClick={handleRefreshAllModels} variant="outline" disabled={refreshingModels} className="border-2 border-border btn-scale" title={t('accounts.refreshModels')}>
                  <Server className={`w-4 h-4 sm:mr-2 ${refreshingModels ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{t('accounts.refreshModels')}</span>
                </Button>
                <Button
                  onClick={onAdd}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all btn-scale"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('accounts.add')}</span>
                </Button>
              </div>
            </div>

            {/* 批量操作栏 */}
            {selectedIds.length > 0 && (
              <div className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-lg p-4 animate-in slide-in-from-top-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.length === filteredAccounts.length}
                      onCheckedChange={toggleSelectAll}
                      className="border-2"
                    />
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      {t('accounts.batch.selected', { count: selectedIds.length })}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(async (ids) => {
                        await Promise.all(ids.map(id => onRefreshAccount(id)))
                        notify.success(t('accounts.batch.refreshSuccess', { count: ids.length }))
                      })}
                      className="border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 btn-scale"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {t('accounts.batch.refresh')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(onBatchEnable)}
                      className="border-2 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 btn-scale"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t('accounts.batch.enable')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(onBatchDisable)}
                      className="border-2 border-border hover:bg-secondary btn-scale"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('accounts.batch.disable')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBatchAction(onBatchDelete)}
                      className="shadow-md hover:shadow-lg btn-scale"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('accounts.batch.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 账户列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>{t('common.loading')}</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="border-0 shadow-md glass">
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || filterStatus !== 'all' ? t('accounts.noMatch') : t('accounts.noAccounts')}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={onAdd} variant="outline" className="mt-4 border-2 border-border">
                <Plus className="w-4 h-4 mr-2" />
                {t('accounts.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredAccounts.map((account, index) => {
            const breakdown = getBreakdown(account)
            const quota = getQuota(account)
            const used = getUsed(account)
            const percent = getUsagePercent(account)
            const hasOverageUsage = hasOverage(account)
            const overageEnabled = isOverageEnabled(account)
            const overageUsed = getOverageUsed(account)
            const overageCap = getOverageCap(account)
            const overageCharges = getOverageCharges(account)
            const overageRate = getOverageRate(account)
            const isHighUsage = percent > 80
            const isCriticalUsage = percent > 90
            // 检查超额资格
            const hasOverageCapability = account.usageData?.subscriptionInfo?.overageCapability === 'OVERAGE_CAPABLE'

            return (
              <Card
                key={account.id}
                className={`card-hover border-0 shadow-md glass overflow-hidden group relative animate-in fade-in slide-in-from-bottom-2 transition-all duration-300 ${
                  !account.enabled ? 'opacity-50 grayscale hover:opacity-60 transition-opacity' : ''
                } ${
                  actionLoading[account.id] === 'refresh' ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg shadow-blue-500/50' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* 顶部装饰条 */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
                  actionLoading[account.id] === 'refresh'
                    ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-pulse'
                    : account.enabled
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`} />

                {/* 刷新中遮罩 */}
                {actionLoading[account.id] === 'refresh' && (
                  <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none z-20 animate-pulse">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-semibold">{t('messages.refreshing') || '刷新中...'}</span>
                    </div>
                  </div>
                )}

                {/* 禁用遮罩 */}
                {!account.enabled && (
                  <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-100/5 pointer-events-none" />
                )}

                <CardContent className="pt-1.5 pb-1.5 relative z-10">
                  <div className="flex gap-1.5">
                    {/* 左侧：头像和选择框 */}
                    <div className="flex flex-col items-center gap-0.5">
                      <Checkbox
                        checked={selectedIds.includes(account.id)}
                        onCheckedChange={() => toggleSelect(account.id)}
                        className="border border-border"
                      />
                      <div className="relative">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                          (account.usageData?.subscriptionInfo?.type || '').toUpperCase().includes('PRO')
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                            : 'bg-gradient-to-br from-muted-foreground to-muted-foreground'
                        }`}>
                          {(account.nickname || account.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        {/* 状态指示器 */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background ${
                          account.enabled ? 'bg-green-500' : 'bg-muted-foreground'
                        }`}>
                          {account.enabled && (
                            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 中间：主要信息 */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* 标题行 */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <h3 className="font-semibold text-xs truncate">
                              {account.nickname || account.email}
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-3.5 px-0.5 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                              onClick={() => handleCopyId(account.id)}
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                          {account.nickname && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              {account.email}
                            </p>
                          )}
                        </div>

                        {/* 徽章组 */}
                        <div className="flex flex-wrap gap-0.5 justify-end">
                          <Badge
                            className={`text-xs h-4 px-1 ${
                              (account.usageData?.subscriptionInfo?.type || '').toUpperCase().includes('PRO')
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 shadow-sm'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {account.usageData?.subscriptionInfo?.subscriptionTitle ||
                             account.usageData?.subscriptionInfo?.type ||
                             'Free'}
                          </Badge>
                          {account.enabled ? (
                            <Badge className="text-xs h-4 px-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 border">
                              <CheckCircle2 className="w-2 h-2 mr-0.5" />
                              {t('accounts.status.enabled')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs h-4 px-1 text-muted-foreground border-border">
                              {t('accounts.status.disabled')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 统计数据 */}
                      <div className="flex gap-0.5 flex-wrap">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded px-1 py-0.5 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                          <TrendingUp className="w-2 h-2 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-700 dark:text-blue-300">{t('accounts.stats.requests')}</span>
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{formatNumber(account.requestCount || 0)}</span>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded px-1 py-0.5 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                          <Activity className="w-2 h-2 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs text-purple-700 dark:text-purple-300">{t('accounts.stats.auth')}</span>
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-100">{account.authMethod === 'idc' ? 'IdC' : 'Social'}</span>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded px-1 py-0.5 border border-green-200 dark:border-green-800 flex items-center gap-0.5">
                          <Clock className="w-2 h-2 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-700 dark:text-green-300">{t('accounts.stats.lastUsed')}</span>
                          <span className="text-xs font-semibold text-green-900 dark:text-green-100">{formatDate(account.lastUsed)}</span>
                        </div>
                      </div>

                      {/* 用量和额度详情 */}
                      {breakdown && (
                        <div className="bg-gradient-to-br from-secondary to-secondary rounded px-1.5 py-0.5 border border-border space-y-0.5">
                          {/* 标题行 */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-0.5">
                              <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${
                                hasOverageUsage ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                                isCriticalUsage ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                isHighUsage ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                'bg-gradient-to-br from-purple-600 to-pink-600'
                              }`}>
                                <Activity className="w-2.5 h-2.5 text-white" />
                              </div>
                              <div className="flex items-center gap-0.5">
                                <p className="text-xs font-semibold">
                                  {breakdown.displayName || breakdown.resourceType || 'Usage'}
                                </p>
                                {breakdown.currency && (
                                  <span className="text-xs px-1 py-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    {breakdown.currency}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 超额状态徽章 */}
                            {overageEnabled && (
                              <Badge className="text-xs h-3.5 px-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                                {t('accounts.overage.badge')}
                              </Badge>
                            )}
                          </div>

                          {/* 用量进度 */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className={`font-semibold ${
                                hasOverageUsage ? 'text-purple-600 dark:text-purple-400' :
                                isCriticalUsage ? 'text-red-600 dark:text-red-400' :
                                isHighUsage ? 'text-orange-600 dark:text-orange-400' :
                                'text-foreground'
                              }`}>
                                {formatUsage(used)} / {formatUsage(quota)}
                              </span>
                              <span className={`font-semibold ${
                                hasOverageUsage ? 'text-purple-600 dark:text-purple-400' :
                                isCriticalUsage ? 'text-red-600 dark:text-red-400' :
                                isHighUsage ? 'text-orange-600 dark:text-orange-400' :
                                'text-foreground'
                              }`}>
                                {hasOverageUsage ? t('accounts.overage.exceeded') : `${percent.toFixed(1)}%`}
                              </span>
                            </div>
                            <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  hasOverageUsage
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                                    : isCriticalUsage
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : isHighUsage
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600'
                                }`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* 超额信息 - 只有具备超额资格的账号才显示 */}
                          {hasOverageCapability && overageRate > 0 && (
                            <div className="pt-0.5 mt-0.5 border-t border-border">
                              {/* 超额开关 - 使用卡片样式 */}
                              <div className="flex items-center justify-between p-1 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 rounded border border-purple-200 dark:border-purple-800/50 mb-0.5">
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Activity className="w-2.5 h-2.5 text-white" />
                                  </div>
                                  <span className="text-xs font-medium text-purple-900 dark:text-purple-100">{t('accounts.overage.billing')}</span>
                                </div>
                                <Switch
                                  checked={overageEnabled}
                                  onCheckedChange={(enabled) => handleOverageToggle(account.id, enabled)}
                                  disabled={overageLoading[account.id]}
                                  className="scale-75"
                                />
                              </div>

                              {/* 当前超额使用 */}
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className={hasOverageUsage ? "text-purple-600 dark:text-purple-400 font-bold" : "text-muted-foreground"}>
                                  {t('accounts.overage.used')}
                                </span>
                                <span className={hasOverageUsage ? "font-bold text-purple-600 dark:text-purple-400" : "text-muted-foreground"}>
                                  {formatUsage(overageUsed)} / {formatUsage(overageCap)}
                                </span>
                              </div>

                              {/* 超额进度条 */}
                              <div className="h-1 rounded-full bg-purple-500/10 overflow-hidden mb-0.5">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                                  style={{ width: `${overageCap > 0 ? Math.min((overageUsed / overageCap) * 100, 100) : 0}%` }}
                                />
                              </div>

                              {/* 超额费用 */}
                              {overageCharges > 0 && (
                                <div className="flex items-center justify-between text-xs p-1 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800/50">
                                  <span className="text-red-700 dark:text-red-300 font-medium">{t('accounts.overage.charges')}</span>
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    {breakdown.currency || 'USD'} {overageCharges.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 重置时间 */}
                          {(() => {
                            const d = parseUpstreamDate(breakdown.nextDateReset)
                            return d ? (
                              <div className="flex items-center gap-0.5 text-xs text-muted-foreground pt-0.5 border-t border-border">
                                <Clock className="w-2.5 h-2.5" />
                                <span>
                                  {d.toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                    </div>

                    {/* 右侧：操作按钮 */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onShowDetail(account.id)}
                        className="h-7 w-7 border border-border hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 btn-scale"
                        title={t('accounts.actions.viewDetail')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleAction(account.id, 'toggle', () => onToggle(account.id, account.enabled))}
                        disabled={actionLoading[account.id] === 'toggle'}
                        className={`h-7 w-7 border border-border btn-scale ${
                          account.enabled
                            ? 'hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                            : 'hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
                        title={account.enabled ? t('accounts.actions.disable') : t('accounts.actions.enable')}
                      >
                        {actionLoading[account.id] === 'toggle' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleAction(account.id, 'refresh', () => onRefreshAccount(account.id))}
                        disabled={actionLoading[account.id] === 'refresh'}
                        className="h-7 w-7 border border-border hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 btn-scale"
                        title={t('accounts.actions.refreshInfo')}
                      >
                        {actionLoading[account.id] === 'refresh' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => onDelete(account.id)}
                        className="h-7 w-7 shadow-sm hover:shadow-md btn-scale"
                        title={t('accounts.actions.deleteAccount')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
