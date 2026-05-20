import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import {
  Plus, Trash2, Key, Clock, Activity, Loader2, Copy,
  RefreshCw, Edit, TestTube,
  CheckCircle2, XCircle, Zap
} from 'lucide-react'

export default function ApiKeysPanel({ apiKeys, loading, onCreate, onDelete, onRefresh, onToggle, onEdit, onTest }) {
  const { t } = useTranslation()
  const notify = useNotification()
  const [searchTerm, setSearchTerm] = useState('')

  const formatDate = (timestamp) => {
    if (!timestamp) return t('apiKeys.fields.neverUsed')
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id)
      .then(() => notify.success(t('apiKeys.copySuccess')))
      .catch(() => notify.error(t('apiKeys.copyError')))
  }

  const filteredKeys = apiKeys.filter(key => 
    key.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter(k => k.lastUsed).length,
    enabled: apiKeys.filter(k => k.enabled !== false).length
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('apiKeys.total')}</p>
                <p className="text-xl font-bold">{stats.total}</p>
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
                <p className="text-xs text-muted-foreground">{t('apiKeys.enabled')}</p>
                <p className="text-xl font-bold">{stats.enabled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('apiKeys.active')}</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card className="border-0 shadow-md glass">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t('apiKeys.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-2 focus:border-purple-500 dark:focus:border-purple-400"
            />
            <Button
              onClick={onCreate}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all btn-scale"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('apiKeys.create')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 密钥列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>{t('common.loading')}</p>
        </div>
      ) : filteredKeys.length === 0 ? (
        <Card className="border-0 shadow-md glass">
          <CardContent className="py-16 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? t('apiKeys.noMatch') : t('apiKeys.noKeys')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? t('apiKeys.tryOtherKeywords') : t('apiKeys.createToAccess')}
            </p>
            {!searchTerm && (
              <Button onClick={onCreate} variant="outline" className="border-2 border-border">
                <Plus className="w-4 h-4 mr-2" />
                {t('apiKeys.createFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key, index) => {
            const isEnabled = key.enabled !== false
            
            return (
              <Card
                key={key.id}
                className={`card-hover border-0 shadow-md glass overflow-hidden group relative animate-in fade-in slide-in-from-bottom-2 ${
                  !isEnabled ? 'opacity-50 grayscale hover:opacity-60 transition-opacity' : ''
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* 顶部状态条 */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  !isEnabled
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                    : key.lastUsed
                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500'
                    : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500'
                }`} />

                {/* 禁用遮罩 */}
                {!isEnabled && (
                  <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-100/5 pointer-events-none" />
                )}

                <CardContent className="pt-4 pb-3 relative z-10">
                  {/* 主要信息行 */}
                  <div className="flex items-center gap-3">
                    {/* 左侧：图标和基本信息 */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${
                        !isEnabled
                          ? 'bg-muted'
                          : 'bg-gradient-to-br from-purple-600 to-pink-600'
                      }`}>
                        <Key className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{key.name}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={() => handleCopyId(key.id)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isEnabled ? (
                            <Badge variant="secondary" className="text-xs h-5 px-2">
                              <XCircle className="w-3 h-3 mr-1" />
                              {t('apiKeys.fields.disabled')}
                            </Badge>
                          ) : key.lastUsed ? (
                            <Badge className="text-xs h-5 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 border">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {t('apiKeys.status.active')}
                            </Badge>
                          ) : (
                            <Badge className="text-xs h-5 px-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 border">
                              <Zap className="w-3 h-3 mr-1" />
                              {t('apiKeys.status.ready')}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ID: {key.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 右侧：操作按钮 */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        onClick={() => onEdit && onEdit(key)}
                        title={t('apiKeys.actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => onTest && onTest(key.id)}
                        title={t('apiKeys.actions.test')}
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                        onClick={() => onRefresh && onRefresh(key.id)}
                        title={t('apiKeys.actions.refresh')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDelete(key.id)}
                        title={t('apiKeys.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
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
