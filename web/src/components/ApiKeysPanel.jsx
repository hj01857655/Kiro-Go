import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Plus, Trash2, Key, Clock, Activity, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function ApiKeysPanel({ apiKeys, loading, onCreate, onDelete }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return '从未'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id)
      .then(() => toast.success('已复制密钥 ID'))
      .catch(() => toast.error('复制失败'))
  }

  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter(k => k.lastUsed).length
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 操作栏 */}
      <Card className="border-0 shadow-md glass">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gradient">API 密钥管理</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 {stats.total} 个密钥，{stats.active} 个已使用
                </p>
              </div>
            </div>
            <Button
              onClick={onCreate}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all btn-scale"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建密钥
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 密钥列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>加载中...</p>
        </div>
      ) : apiKeys.length === 0 ? (
        <Card className="border-0 shadow-md glass">
          <CardContent className="py-16 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-2">暂无 API 密钥</p>
            <p className="text-sm text-muted-foreground mb-4">创建密钥以访问 API 服务</p>
            <Button onClick={onCreate} variant="outline" className="border-2 border-border">
              <Plus className="w-4 h-4 mr-2" />
              创建第一个密钥
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {apiKeys.map((key, index) => (
            <Card
              key={key.id}
              className="card-hover border-0 shadow-md glass overflow-hidden group relative animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* 顶部装饰条 */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                key.lastUsed
                  ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500'
                  : 'bg-gradient-to-r from-muted-foreground to-muted-foreground'
              }`} />

              <CardContent className="pt-5 pb-4">
                <div className="flex gap-4">
                  {/* 左侧：图标 */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                      <Key className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* 中间：信息 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
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
                      {key.lastUsed ? (
                        <Badge className="text-xs h-5 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 border flex-shrink-0">
                          已使用
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs h-5 px-2 text-muted-foreground border-border flex-shrink-0">
                          未使用
                        </Badge>
                      )}
                    </div>

                    {/* 统计信息 */}
                    <div className="flex gap-2 flex-wrap">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded px-2 py-1 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs text-blue-700 dark:text-blue-300">创建</span>
                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">{formatDate(key.createdAt)}</span>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded px-2 py-1 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs text-purple-700 dark:text-purple-300">最后</span>
                        <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">{formatDate(key.lastUsed)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex-shrink-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(key.id)}
                      className="h-8 shadow-sm hover:shadow-md btn-scale"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">删除</span>
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
