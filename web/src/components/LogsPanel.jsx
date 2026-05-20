import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import {
  FileText, RefreshCw, Clock,
  CheckCircle2, XCircle, Activity, Zap,
  User, Globe, ArrowUpCircle, ArrowDownCircle,
  Database, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

export default function LogsPanel({ password }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/admin/api/request-logs', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data || [])
      } else {
        toast.error('加载日志失败')
      }
    } catch (e) {
      toast.error('加载日志失败')
    } finally {
      setLoading(false)
    }
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
          成功
        </Badge>
      )
    } else {
      return (
        <Badge className="text-xs border bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
          <XCircle className="w-3 h-3 mr-1" />
          失败
        </Badge>
      )
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'success' && log.success) ||
      (filterStatus === 'error' && !log.success)
    return matchesStatus
  })

  const successCount = logs.filter(l => l.success).length
  const errorCount = logs.filter(l => !l.success).length
  const totalTokens = logs.reduce((sum, l) => sum + (l.inputTokens || 0) + (l.outputTokens || 0), 0)

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
                <p className="text-xs text-muted-foreground">总请求数</p>
                <p className="text-xl font-bold">{logs.length}</p>
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
                <p className="text-xs text-muted-foreground">成功</p>
                <p className="text-xl font-bold">{successCount}</p>
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
                <p className="text-xs text-muted-foreground">失败</p>
                <p className="text-xl font-bold">{errorCount}</p>
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
                <p className="text-xs text-muted-foreground">总 Tokens</p>
                <p className="text-xl font-bold">{totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card className="border-0 shadow-md glass">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="border-2"
            >
              全部
            </Button>
            <Button
              variant={filterStatus === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('success')}
              className="border-2"
            >
              成功
            </Button>
            <Button
              variant={filterStatus === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('error')}
              className="border-2"
            >
              失败
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="border-2 ml-auto"
            >
              {loading ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card className="border-0 shadow-md glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            请求日志
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
              <p className="text-muted-foreground">暂无请求记录</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredLogs.map((log, index) => (
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
                            {log.stream ? '🌊 流式' : '📦 非流式'}
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
                            {log.inputTokens.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {log.outputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                          <ArrowDownCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                            {log.outputTokens.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {log.cacheCreationInputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
                          <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                            创建 {log.cacheCreationInputTokens.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {log.cacheReadInputTokens > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            读取 {log.cacheReadInputTokens.toLocaleString()}
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
    </div>
  )
}
