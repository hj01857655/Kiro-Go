import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import {
  FileText, RefreshCw, Search, Clock,
  CheckCircle2, XCircle, Activity, Zap
} from 'lucide-react'
import { toast } from 'sonner'

export default function LogsPanel({ password }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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
    const matchesSearch = !searchTerm ||
      log.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.accountEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'success' && log.success) ||
      (filterStatus === 'error' && !log.success)
    return matchesSearch && matchesStatus
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模型、账户、路径或错误信息..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2"
              />
            </div>
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
                className="border-2"
              >
                {loading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
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
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.success)}
                        <Badge variant="outline" className="text-xs">
                          {log.method}
                        </Badge>
                        <span className="font-semibold text-sm">{log.model}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.timestamp)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span>路径: {log.path}</span>
                      {log.accountEmail && <span>账户: {log.accountEmail}</span>}
                      {log.stream !== undefined && (
                        <span>{log.stream ? '流式' : '非流式'}</span>
                      )}
                    </div>

                    {log.errorMessage && (
                      <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                        错误: {log.errorMessage}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {log.inputTokens > 0 && (
                        <span>输入: {log.inputTokens.toLocaleString()} tokens</span>
                      )}
                      {log.outputTokens > 0 && (
                        <span>输出: {log.outputTokens.toLocaleString()} tokens</span>
                      )}
                      {log.cacheCreationInputTokens > 0 && (
                        <span className="text-blue-600 dark:text-blue-400">
                          缓存创建: {log.cacheCreationInputTokens.toLocaleString()}
                        </span>
                      )}
                      {log.cacheReadInputTokens > 0 && (
                        <span className="text-green-600 dark:text-green-400">
                          缓存读取: {log.cacheReadInputTokens.toLocaleString()}
                        </span>
                      )}
                      {log.statusCode && <span>状态码: {log.statusCode}</span>}
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
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
