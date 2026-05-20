import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import {
  Users, Key, Activity, TrendingUp, CheckCircle2, XCircle,
  ArrowUpCircle, ArrowDownCircle, Zap, Clock, Globe, Package
} from 'lucide-react'

export default function DashboardPanel({ password, accounts, apiKeys }) {
  const [stats, setStats] = useState({
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    recentLogs: []
  })
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadVersion()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/admin/api/request-logs?pageSize=100', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        const logs = data.logs || []

        const successCount = logs.filter(l => l.success).length
        const failedCount = logs.filter(l => !l.success).length
        const totalInput = logs.reduce((sum, l) => sum + (l.inputTokens || 0), 0)
        const totalOutput = logs.reduce((sum, l) => sum + (l.outputTokens || 0), 0)

        setStats({
          totalRequests: logs.length,
          successRequests: successCount,
          failedRequests: failedCount,
          totalInputTokens: totalInput,
          totalOutputTokens: totalOutput,
          recentLogs: logs.slice(0, 5)
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
  const onlineAccounts = accounts.filter(a => a.status === 'online').length
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
    return new Date(timestamp).toLocaleString('zh-CN', {
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
                <p className="text-sm text-muted-foreground mb-1">账户总数</p>
                <p className="text-3xl font-bold">{accounts.length}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {enabledAccounts} 启用
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700">
                    {disabledAccounts} 禁用
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                <p className="text-sm text-muted-foreground mb-1">API Keys</p>
                <p className="text-3xl font-bold">{apiKeys.length}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    <Zap className="w-3 h-3 mr-1" />
                    {enabledKeys} 活跃
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                <p className="text-sm text-muted-foreground mb-1">总请求数</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalRequests)}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    {successRate}% 成功
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                <p className="text-sm text-muted-foreground mb-1">Token 使用</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    <ArrowUpCircle className="w-3 h-3 mr-1" />
                    {formatNumber(stats.totalInputTokens)}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                    <ArrowDownCircle className="w-3 h-3 mr-1" />
                    {formatNumber(stats.totalOutputTokens)}
                  </Badge>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
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
              账户状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium">在线</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{onlineAccounts}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">离线</span>
                </div>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{accounts.length - onlineAccounts}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">启用率</span>
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
              请求统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">成功</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.successRequests}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">失败</span>
                </div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">{stats.failedRequests}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">成功率</span>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            最近活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无活动记录</p>
          ) : (
            <div className="space-y-2">
              {stats.recentLogs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.model || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.accountEmail || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {(log.inputTokens || 0) + (log.outputTokens || 0)} tokens
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</span>
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
                <p className="text-sm text-muted-foreground">系统版本</p>
                <p className="text-lg font-semibold">{version || 'Loading...'}</p>
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
