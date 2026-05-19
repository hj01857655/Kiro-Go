import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import {
  RefreshCw, Trash2, Power, Plus, Search,
  Eye, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, Users, Activity, Filter, Download,
  PowerOff, Check, X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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
  onBatchDelete
}) {
  const [actionLoading, setActionLoading] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('lastUsed')

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

  let filteredAccounts = accounts.filter(acc => {
    const matchesSearch = !searchTerm ||
      acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.id?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'enabled' && acc.enabled) ||
      (filterStatus === 'disabled' && !acc.enabled) ||
      (filterStatus === 'pro' && acc.subscriptionType?.includes('Pro'))

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
        const aUsage = a.usageCurrent / a.usageLimit || 0
        const bUsage = b.usageCurrent / b.usageLimit || 0
        return bUsage - aUsage
      default:
        return 0
    }
  })

  const stats = {
    total: accounts.length,
    enabled: accounts.filter(a => a.enabled).length,
    disabled: accounts.filter(a => !a.enabled).length,
    pro: accounts.filter(a => a.subscriptionType?.includes('Pro')).length
  }

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
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilterStatus('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总账户</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilterStatus('enabled')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已启用</p>
                <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilterStatus('disabled')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">已禁用</p>
                <p className="text-2xl font-bold text-gray-400">{stats.disabled}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setFilterStatus('pro')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pro 账户</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pro}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索账户（邮箱、昵称、ID）..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastUsed">最后使用</SelectItem>
                <SelectItem value="email">邮箱</SelectItem>
                <SelectItem value="requests">请求数</SelectItem>
                <SelectItem value="usage">用量</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onRefresh} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">刷新</span>
            </Button>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">添加</span>
            </Button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.length === filteredAccounts.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    已选择 {selectedIds.length} 个账户
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchAction(onBatchEnable)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    批量启用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchAction(onBatchDisable)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    批量禁用
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBatchAction(onBatchDelete)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    批量删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 账户列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>加载中...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || filterStatus !== 'all' ? '未找到匹配的账户' : '暂无账户'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={onAdd} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                添加第一个账户
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-all duration-200 border-l-4"
                  style={{ borderLeftColor: account.enabled ? '#10b981' : '#d1d5db' }}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* 选择框 */}
                  <Checkbox
                    checked={selectedIds.includes(account.id)}
                    onCheckedChange={() => toggleSelect(account.id)}
                    className="mt-1"
                  />

                  {/* 账户信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">
                        {account.nickname || account.email}
                      </h3>
                      <Badge {...getSubBadge(account.subscriptionType)}>
                        {getSubBadge(account.subscriptionType).label}
                      </Badge>
                      {account.enabled ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          已启用
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-400">
                          已禁用
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 truncate">{account.email}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">认证:</span>
                        {account.authMethod === 'idc' ? 'IdC' : 'Social'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">请求:</span>
                        {account.requestCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">最后使用:</span>
                        {formatDate(account.lastUsed)}
                      </span>
                    </div>

                    {/* 用量进度条 */}
                    {account.usageCurrent !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">用量</span>
                          <span className="font-medium">
                            {account.usageCurrent?.toFixed(2)} / {account.usageLimit?.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              (account.usageCurrent / account.usageLimit) > 0.9
                                ? 'bg-red-500'
                                : (account.usageCurrent / account.usageLimit) > 0.7
                                ? 'bg-yellow-500'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600'
                            }`}
                            style={{ width: `${Math.min((account.usageCurrent / account.usageLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 flex-wrap lg:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowDetail(account.id)}
                    >
                      <Eye className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">详情</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(account.id, () => onRefreshAccount(account.id))}
                      disabled={actionLoading[account.id] === 'refresh'}
                    >
                      <RefreshCw className={`w-4 h-4 lg:mr-2 ${actionLoading[account.id] === 'refresh' ? 'animate-spin' : ''}`} />
                      <span className="hidden lg:inline">刷新</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(account.id, () => onToggle(account.id, account.enabled))}
                      disabled={actionLoading[account.id] === 'toggle'}
                    >
                      <Power className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">{account.enabled ? '禁用' : '启用'}</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAction(account.id, () => onDelete(account.id))}
                      disabled={actionLoading[account.id] === 'delete'}
                    >
                      <Trash2 className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">删除</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
