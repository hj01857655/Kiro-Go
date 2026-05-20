import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import {
  RefreshCw, Trash2, Power, Plus, Search,
  Eye, Loader2, Activity, Download, Upload,
  Check, X, Copy, Mail, Clock, ChevronDown, ChevronUp,
  CheckCircle2, TrendingUp
} from 'lucide-react'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { exportToJSON, exportToCSV, copyToClipboard } from '../lib/utils'
import { toast } from 'sonner'
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
  const [actionLoading, setActionLoading] = useState({})
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('lastUsed')
  const [expandedCards, setExpandedCards] = useState({}) // 记录哪些卡片展开了用量详情
  const [overageLoading, setOverageLoading] = useState({})
  const [showImportModal, setShowImportModal] = useState(false)

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
        toast.success(enabled ? '超额计费已启用' : '超额计费已关闭')
        onRefresh()
      } else {
        const data = await res.json()
        toast.error(data.error || '操作失败')
      }
    } catch (e) {
      toast.error('操作失败')
    } finally {
      setOverageLoading(prev => ({ ...prev, [accountId]: false }))
    }
  }

  const selectedIds = selectedAccounts
  const setSelectedIds = onSelectedAccountsChange || (() => {})

  const handleAction = async (id, action) => {
    setActionLoading({ ...actionLoading, [id]: action })
    await action()
    setActionLoading({ ...actionLoading, [id]: null })
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
      subscriptionType: acc.subscriptionType,
      authMethod: acc.authMethod,
      provider: acc.provider,
      requestCount: acc.requestCount,
      lastUsed: acc.lastUsed
    }))
    exportToJSON(exportData, `accounts-${new Date().toISOString().split('T')[0]}.json`)
    toast.success('已导出为 JSON 文件')
  }

  const handleExportCSV = () => {
    const exportData = filteredAccounts.map(acc => ({
      ID: acc.id,
      邮箱: acc.email,
      昵称: acc.nickname || '',
      状态: acc.enabled ? '已启用' : '已禁用',
      订阅类型: acc.subscriptionType || 'Free',
      认证方式: acc.authMethod === 'idc' ? 'IdC' : 'Social',
      提供商: acc.provider || '',
      请求次数: acc.requestCount || 0,
      最后使用: acc.lastUsed ? new Date(acc.lastUsed * 1000).toLocaleString('zh-CN') : '从未'
    }))
    exportToCSV(exportData, `accounts-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('已导出为 CSV 文件')
  }

  const handleCopyId = (id) => {
    copyToClipboard(id)
      .then(() => toast.success('已复制账户 ID'))
      .catch(() => toast.error('复制失败'))
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
      (filterStatus === 'overage' && hasOverage(acc))

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
    if (!timestamp) return '从未'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
                    placeholder="搜索账户（邮箱、昵称、ID）..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 w-full border-2 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] border-2">
                    <SelectValue placeholder="筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部账户</SelectItem>
                    <SelectItem value="enabled">已启用</SelectItem>
                    <SelectItem value="disabled">已禁用</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="idc">IdC认证</SelectItem>
                    <SelectItem value="social">Social认证</SelectItem>
                    <SelectItem value="high-usage">高用量(&gt;80%)</SelectItem>
                    <SelectItem value="overage">超额使用</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] border-2">
                    <SelectValue placeholder="排序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastUsed">最后使用</SelectItem>
                    <SelectItem value="email">邮箱</SelectItem>
                    <SelectItem value="requests">请求次数</SelectItem>
                    <SelectItem value="usage">用量百分比</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="border-2 border-border"
                >
                  <Upload className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">导入</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-2 border-border">
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">导出</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass">
                    <DropdownMenuLabel>导出格式</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportJSON}>
                      导出为 JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      导出为 CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={onRefresh} variant="outline" disabled={loading} className="border-2 border-border btn-scale">
                  <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">刷新</span>
                </Button>
                <Button
                  onClick={onAdd}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all btn-scale"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">添加</span>
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
                      已选择 {selectedIds.length} 个账户
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(async (ids) => {
                        await Promise.all(ids.map(id => onRefreshAccount(id)))
                        toast.success(`已刷新 ${ids.length} 个账户`)
                      })}
                      className="border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 btn-scale"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      批量刷新
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(onBatchEnable)}
                      className="border-2 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 btn-scale"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      批量启用
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchAction(onBatchDisable)}
                      className="border-2 border-border hover:bg-secondary btn-scale"
                    >
                      <X className="w-4 h-4 mr-1" />
                      批量禁用
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBatchAction(onBatchDelete)}
                      className="shadow-md hover:shadow-lg btn-scale"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      批量删除
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
          <p>加载中...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="border-0 shadow-md glass">
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || filterStatus !== 'all' ? '未找到匹配的账户' : '暂无账户'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={onAdd} variant="outline" className="mt-4 border-2 border-border">
                <Plus className="w-4 h-4 mr-2" />
                添加第一个账户
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
                className="card-hover border-0 shadow-md glass overflow-hidden group relative animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* 顶部装饰条 */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  account.enabled
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500'
                    : 'bg-gradient-to-r from-muted-foreground to-muted-foreground'
                }`} />

                <CardContent className="pt-1.5 pb-1.5">
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
                             account.subscriptionType ||
                             'Free'}
                          </Badge>
                          {account.enabled ? (
                            <Badge className="text-xs h-4 px-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 border">
                              <CheckCircle2 className="w-2 h-2 mr-0.5" />
                              启用
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs h-4 px-1 text-muted-foreground border-border">
                              禁用
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 统计数据 */}
                      <div className="flex gap-0.5 flex-wrap">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded px-1 py-0.5 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                          <TrendingUp className="w-2 h-2 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-blue-700 dark:text-blue-300">请求</span>
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{account.requestCount || 0}</span>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded px-1 py-0.5 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                          <Activity className="w-2 h-2 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs text-purple-700 dark:text-purple-300">认证</span>
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-100">{account.authMethod === 'idc' ? 'IdC' : 'Social'}</span>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded px-1 py-0.5 border border-green-200 dark:border-green-800 flex items-center gap-0.5">
                          <Clock className="w-2 h-2 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-700 dark:text-green-300">最后</span>
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
                                超额
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
                                {hasOverageUsage ? '超额' : `${percent.toFixed(1)}%`}
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
                                  <span className="text-xs font-medium text-purple-900 dark:text-purple-100">超额计费</span>
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
                                  已用超额
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
                                  <span className="text-red-700 dark:text-red-300 font-medium">已产生费用</span>
                                  <span className="font-bold text-red-600 dark:text-red-400">
                                    {breakdown.currency || 'USD'} {overageCharges.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 重置时间 */}
                          {breakdown.nextDateReset && (
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground pt-0.5 border-t border-border">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {new Date(breakdown.nextDateReset * 1000).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
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
                        title="查看详情"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleAction(account.id, () => onToggle(account.id, account.enabled))}
                        disabled={actionLoading[account.id] === 'toggle'}
                        className={`h-7 w-7 border border-border btn-scale ${
                          account.enabled
                            ? 'hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                            : 'hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
                        title={account.enabled ? '禁用账户' : '启用账户'}
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
                        onClick={() => handleAction(account.id, () => onRefreshAccount(account.id))}
                        disabled={actionLoading[account.id] === 'refresh'}
                        className="h-7 w-7 border border-border hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 btn-scale"
                        title="刷新账户信息"
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
                        title="删除账户"
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
