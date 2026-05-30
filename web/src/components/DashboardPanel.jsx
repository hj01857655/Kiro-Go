import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Users, Key, Activity, TrendingUp, CheckCircle2, XCircle,
  ArrowUpCircle, ArrowDownCircle, Zap, Clock, Globe, Package,
  Database, Sparkles, RefreshCw, User
} from 'lucide-react'

export default function DashboardPanel({ password, accounts, apiKeys }) {
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    recentLogs: []
  })
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadVersion()

    // 每30秒自动刷新统计数据
    const interval = setInterval(() => {
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/admin/api/request-logs?pageSize=0', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        const logs = data.logs || []

        const successCount = logs.filter(l => l.success).length
        const failedCount = logs.filter(l => !l.success).length
        const totalInput = logs.reduce((sum, l) => sum + (l.inputTokens || 0), 0)
        const totalOutput = logs.reduce((sum, l) => sum + (l.outputTokens || 0), 0)
        const cacheCreation = logs.reduce((sum, l) => sum + (l.cacheCreationInputTokens || 0), 0)
        const cacheRead = logs.reduce((sum, l) => sum + (l.cacheReadInputTokens || 0), 0)

        // 按时间戳降序排序，取最新的5条
        const sortedLogs = [...logs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

        setStats({
          totalRequests: data.total || 0,
          successRequests: successCount,
          failedRequests: failedCount,
          totalInputTokens: totalInput,
          totalOutputTokens: totalOutput,
          cacheCreationTokens: cacheCreation,
          cacheReadTokens: cacheRead,
          recentLogs: sortedLogs.slice(0, 5)
        })
      }
    } catch (e) {
      console.error('Failed to load stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadVersion = async () => {
    try {
      const res = await fetch('/admin/api/version', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        setVersion(data.version || 'Unknown')
      }
    } catch (e) {
      console.error('Failed to load version:', e)
    }
  }

  const enabledAccounts = accounts.filter(a => a.enabled).length
  const disabledAccounts = accounts.length - enabledAccounts
  // main 基底的 Account 没有通用 status 字段，用"启用且未被封禁/禁用"表示可用
  const isAccountAvailable = (a) => a.enabled && a.banStatus !== 'BANNED' && a.banStatus !== 'DISABLED'
  const onlineAccounts = accounts.filter(isAccountAvailable).length
  const enabledKeys = apiKeys.filter(k => k.enabled).length

  const successRate = stats.totalRequests > 0
    ? ((stats.successRequests / stats.totalRequests) * 100).toFixed(1)
    : 0

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString(i18n.language, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 账户统计 */}
        <Card className="border-0 shadow-lg glass hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.accounts')}</p>
                <p className="text-3xl font-bold">{accounts.length}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {enabledAccounts} {t('accounts.enabled')}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700">
                    {disabledAccounts} {t('common.disabled')}
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys 统计 */}
        <Card className="border-0 shadow-lg glass hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.apiKeys')}</p>
                <p className="text-3xl font-bold">{apiKeys.length}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    <Zap className="w-3 h-3 mr-1" />
                    {enabledKeys} {t('apiKeys.enabled')}
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center shadow-lg">
                <Key className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 请求统计 */}
        <Card className="border-0 shadow-lg glass hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.requests')}</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalRequests)}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    {successRate}% {t('dashboard.success')}
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center shadow-lg">
                <Activity className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token 统计 */}
        <Card className="border-0 shadow-lg glass hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.tokens')}</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    <ArrowUpCircle className="w-3 h-3 mr-1" />
                    {formatNumber(stats.totalInputTokens)}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                    <ArrowDownCircle className="w-3 h-3 mr-1" />
                    {formatNumber(stats.totalOutputTokens)}
                  </Badge>
                  {stats.cacheCreationTokens > 0 && (
                    <Badge variant="outline" className="text-xs bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700">
                      <Database className="w-3 h-3 mr-1" />
                      {formatNumber(stats.cacheCreationTokens)}
                    </Badge>
                  )}
                  {stats.cacheReadTokens > 0 && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {formatNumber(stats.cacheReadTokens)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-md flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 账户状态 */}
        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('dashboard.accountStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">{t('dashboard.online')}</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{onlineAccounts}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">{t('dashboard.offline')}</span>
                </div>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{accounts.length - onlineAccounts}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{t('dashboard.enabledRate')}</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {accounts.length > 0 ? ((enabledAccounts / accounts.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 请求统计 */}
        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('dashboard.requestStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{t('dashboard.success')}</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.successRequests}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">{t('dashboard.failed')}</span>
                </div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{stats.failedRequests}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{t('dashboard.successRate')}</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{successRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card className="border-0 shadow-lg glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('dashboard.recentActivity')}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noActivity')}</p>
          ) : (
            <div className="space-y-3">
              {stats.recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-md border-2 transition-all hover:shadow-md ${
                    log.success
                      ? 'bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200 dark:border-green-800/50'
                      : 'bg-gradient-to-br from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10 border-red-200 dark:border-red-800/50'
                  }`}
                >
                  {/* 第一行：状态、模型、方法、状态码 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <Badge className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                        {log.model || 'Unknown'}
                      </Badge>
                      {log.method && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {log.method}
                        </Badge>
                      )}
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
                          {log.stream ? '🌊' : '📦'}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{formatDate(log.timestamp)}</span>
                  </div>

                  {/* 第二行：账户和路径 */}
                  <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{log.accountEmail || 'Unknown'}</span>
                    </div>
                    {log.path && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="font-mono truncate max-w-[300px]">{log.path}</span>
                      </div>
                    )}
                  </div>

                  {/* 错误信息 */}
                  {log.errorMessage && (
                    <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
                      <p className="text-xs text-red-700 dark:text-red-300 truncate">{log.errorMessage}</p>
                    </div>
                  )}

                  {/* Token 统计 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.inputTokens > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                        <ArrowUpCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {formatNumber(log.inputTokens)}
                        </span>
                      </div>
                    )}
                    {log.outputTokens > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                        <ArrowDownCircle className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {formatNumber(log.outputTokens)}
                        </span>
                      </div>
                    )}
                    {log.cacheCreationInputTokens > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
                        <Database className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                          {formatNumber(log.cacheCreationInputTokens)}
                        </span>
                      </div>
                    )}
                    {log.cacheReadInputTokens > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          {formatNumber(log.cacheReadInputTokens)}
                        </span>
                      </div>
                    )}
                    {log.duration && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-900/30 rounded-md">
                        <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {log.duration}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 版本信息 */}
      <Card className="border-0 shadow-lg glass">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.systemVersion')}</p>
                <p className="text-lg font-semibold">{version || t('common.loading')}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Kiro-Go
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
