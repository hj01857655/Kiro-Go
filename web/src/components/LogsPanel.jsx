import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import {
  FileText, RefreshCw, Clock,
  CheckCircle2, XCircle, Activity, Zap,
  User, Globe, ArrowUpCircle, ArrowDownCircle,
  Database, Sparkles, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function LogsPanel({ password }) {
  const { t } = useTranslation()
  const notify = useNotification()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterModel, setFilterModel] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [sortBy, setSortBy] = useState('time-desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    loadLogs()
  }, [page, pageSize])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/api/request-logs?page=${page}&pageSize=${pageSize}`, {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setTotalPages(data.pages || 0)
      } else {
        notify.error(t('logs.messages.loadError'))
      }
    } catch (e) {
      notify.error(t('logs.messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = () => {
    loadLogs()
    loadStats()
  }

  const clearLogs = async () => {
    if (!confirm(t('logs.messages.clearConfirm'))) {
      return
    }
    try {
      const res = await fetch('/admin/api/request-logs', {
        method: 'DELETE',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        setLogs([])
        setStats({ totalRequests: 0, successCount: 0, errorCount: 0, totalTokens: 0 })
        setTotal(0)
        setTotalPages(0)
        setPage(1)
        notify.success(t('logs.messages.clearSuccess'))
      } else {
        notify.error(t('logs.messages.clearError'))
      }
    } catch (e) {
      notify.error(t('logs.messages.clearError'))
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusBadge = (success) => {
    if (success) {
      return (
        <Badge className="text-xs border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t('logs.success')}
        </Badge>
      )
    } else {
      return (
        <Badge className="text-xs border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          {t('logs.failed')}
        </Badge>
      )
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'success' && log.success) ||
      (filterStatus === 'error' && !log.success)

    const matchesModel = filterModel === 'all' || log.model === filterModel

    const matchesAccount = filterAccount === 'all' || log.accountEmail === filterAccount

    return matchesStatus && matchesModel && matchesAccount
  })

  // 排序
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    switch (sortBy) {
      case 'time-desc':
        return (b.timestamp || 0) - (a.timestamp || 0) // 最新的在前
      case 'time-asc':
        return (a.timestamp || 0) - (b.timestamp || 0) // 最旧的在前
      case 'tokens-desc':
        const aTokens = (a.inputTokens || 0) + (a.outputTokens || 0)
        const bTokens = (b.inputTokens || 0) + (b.outputTokens || 0)
        return bTokens - aTokens
      case 'tokens-asc':
        const aTokens2 = (a.inputTokens || 0) + (a.outputTokens || 0)
        const bTokens2 = (b.inputTokens || 0) + (b.outputTokens || 0)
        return aTokens2 - bTokens2
      case 'duration-desc':
        return (b.duration || 0) - (a.duration || 0)
      case 'duration-asc':
        return (a.duration || 0) - (b.duration || 0)
      default:
        return 0
    }
  })

  // 获取唯一的模型和账户列表
  const uniqueModels = [...new Set(logs.map(l => l.model).filter(Boolean))]
  const uniqueAccounts = [...new Set(logs.map(l => l.accountEmail).filter(Boolean))]

  // 统计数据需要基于所有日志，而不是当前页
  const [stats, setStats] = useState({
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    totalTokens: 0
  })

  // 加载统计数据（获取所有日志进行统计）
  const loadStats = async () => {
    try {
      const res = await fetch('/admin/api/request-logs?pageSize=10000', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        const allLogs = data.logs || []
        setStats({
          totalRequests: data.total || 0,
          successCount: allLogs.filter(l => l.success).length,
          errorCount: allLogs.filter(l => !l.success).length,
          totalTokens: allLogs.reduce((sum, l) => sum + (l.inputTokens || 0) + (l.outputTokens || 0), 0)
        })
      }
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('logs.totalRequests')}</p>
                <p className="text-xl font-bold">{stats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('logs.success')}</p>
                <p className="text-xl font-bold">{stats.successCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('logs.failed')}</p>
                <p className="text-xl font-bold">{stats.errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('logs.totalTokens')}</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalTokens)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card className="border-0 shadow-md glass">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className="border-2"
              >
                {t('logs.filters.all')}
              </Button>
              <Button
                variant={filterStatus === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('success')}
                className="border-2"
              >
                {t('logs.filters.success')}
              </Button>
              <Button
                variant={filterStatus === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('error')}
                className="border-2"
              >
                {t('logs.filters.failed')}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {uniqueModels.length > 1 && (
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  className="text-xs border-2 rounded-md px-2 py-1 bg-background"
                >
                  <option value="all">{t('logs.filters.allModels')}</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              )}
              {uniqueAccounts.length > 1 && (
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="text-xs border-2 rounded-md px-2 py-1 bg-background"
                >
                  <option value="all">{t('logs.filters.allAccounts')}</option>
                  {uniqueAccounts.map(account => (
                    <option key={account} value={account}>{account}</option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border-2 rounded-md px-2 py-1 bg-background"
              >
                <option value="time-desc">{t('logs.sort.timeDesc')}</option>
                <option value="time-asc">{t('logs.sort.timeAsc')}</option>
                <option value="tokens-desc">{t('logs.sort.tokensDesc')}</option>
                <option value="tokens-asc">{t('logs.sort.tokensAsc')}</option>
                <option value="duration-desc">{t('logs.sort.durationDesc')}</option>
                <option value="duration-asc">{t('logs.sort.durationAsc')}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={loading}
                className="border-2"
              >
                {loading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearLogs}
                disabled={loading || logs.length === 0}
                className="border-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card className="border-0 shadow-md glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('logs.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('logs.noLogs')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {sortedLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      log.success
                        ? 'bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700'
                        : 'bg-gradient-to-br from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10 border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    {/* 第一行：状态、方法、模型、状态码、流式、时间 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(log.success)}
                        <Badge variant="outline" className="text-xs font-mono">
                          {log.method}
                        </Badge>
                        <Badge className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          {log.model}
                        </Badge>
                        {log.statusCode && (
                          <Badge variant="outline" className={`text-xs font-mono ${
                            log.statusCode === 200
                              ? 'border-green-500 text-green-700 dark:text-green-400'
                              : 'border-red-500 text-red-700 dark:text-red-400'
                          }`}>
                            {log.statusCode}
                          </Badge>
                        )}
                        {log.stream !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {log.stream ? t('logs.stream.streaming') : t('logs.stream.nonStreaming')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    {/* 第二行：路径和账户 */}
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="font-mono">{log.path}</span>
                      </div>
                      {log.accountEmail && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          <span>{log.accountEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* 错误信息 */}
                    {log.errorMessage && (
                      <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-red-700 dark:text-red-300 break-all">{log.errorMessage}</span>
                        </div>
                      </div>
                    )}

                    {/* Token 统计 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {log.inputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            {formatNumber(log.inputTokens)}
                          </span>
                        </div>
                      )}
                      {log.outputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                          <ArrowDownCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            {formatNumber(log.outputTokens)}
                          </span>
                        </div>
                      )}
                      {log.cacheCreationInputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
                          <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                            {t('logs.cache.creation')} {formatNumber(log.cacheCreationInputTokens)}
                          </span>
                        </div>
                      )}
                      {log.cacheReadInputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {t('logs.cache.read')} {formatNumber(log.cacheReadInputTokens)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('logs.pagination.total', { total, page, totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className={page === pageNum ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
