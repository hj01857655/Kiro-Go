import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import {
  Shield, RefreshCw, Trash2, Clock, User, Activity,
  AlertTriangle, Info, AlertCircle, CheckCircle2
} from 'lucide-react'

export default function AuditLogsPanel({ password }) {
  const { t, i18n } = useTranslation()
  const notify = useNotification()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterLevel, setFilterLevel] = useState('all')

  useEffect(() => {
    loadLogs()
    // 每30秒自动刷新
    const interval = setInterval(() => {
      loadLogs()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/admin/api/audit-logs', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data || [])
      } else {
        notify.error(t('auditLogs.loadError'))
      }
    } catch (e) {
      notify.error(t('auditLogs.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm(t('auditLogs.clearConfirm'))) {
      return
    }
    try {
      const res = await fetch('/admin/api/audit-logs', {
        method: 'DELETE',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        setLogs([])
        notify.success(t('auditLogs.clearSuccess'))
      } else {
        notify.error(t('auditLogs.clearError'))
      }
    } catch (e) {
      notify.error(t('auditLogs.clearError'))
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
    return new Date(timestamp).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
    }
  }

  const getLevelBadge = (level) => {
    const variants = {
      error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      default: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
    }
    return variants[level] || variants.default
  }

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'all') return true
    return log.level === filterLevel
  })

  const stats = {
    total: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('auditLogs.total')}</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('auditLogs.error')}</p>
                <p className="text-xl font-bold">{stats.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('auditLogs.warning')}</p>
                <p className="text-xl font-bold">{stats.warning}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('auditLogs.info')}</p>
                <p className="text-xl font-bold">{stats.info}</p>
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
                variant={filterLevel === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('all')}
                className="border-2"
              >
                {t('auditLogs.filters.all')}
              </Button>
              <Button
                variant={filterLevel === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('error')}
                className="border-2"
              >
                {t('auditLogs.filters.error')}
              </Button>
              <Button
                variant={filterLevel === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('warning')}
                className="border-2"
              >
                {t('auditLogs.filters.warning')}
              </Button>
              <Button
                variant={filterLevel === 'info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('info')}
                className="border-2"
              >
                {t('auditLogs.filters.info')}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('auditLogs.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Activity className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('auditLogs.noLogs')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      log.level === 'error'
                        ? 'bg-gradient-to-br from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10 border-red-200 dark:border-red-800/50'
                        : log.level === 'warning'
                        ? 'bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/20 dark:to-amber-950/10 border-yellow-200 dark:border-yellow-800/50'
                        : 'bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 border-blue-200 dark:border-blue-800/50'
                    }`}
                  >
                    {/* 第一行：级别、操作、时间 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLevelIcon(log.level)}
                        <Badge variant="outline" className={`text-xs ${getLevelBadge(log.level)}`}>
                          {log.level?.toUpperCase() || 'INFO'}
                        </Badge>
                        <Badge className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          {log.action}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    {/* 第二行：用户和目标 */}
                    <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                      {log.user && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>{log.user}</span>
                        </div>
                      )}
                      {log.target && (
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[300px]">{log.target}</span>
                        </div>
                      )}
                    </div>

                    {/* 消息 */}
                    <div className="mb-2">
                      <p className="text-sm font-medium">{log.message}</p>
                    </div>

                    {/* 元数据 */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="p-2 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground font-mono">
                          {JSON.stringify(log.metadata, null, 2)}
                        </p>
                      </div>
                    )}
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
