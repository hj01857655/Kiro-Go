import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Upload, Loader2, AlertCircle, Braces } from 'lucide-react'
import { useNotification } from './ui/notification'

export default function ImportAccountsModal({ open, onOpenChange, password, onSuccess }) {
  const notify = useNotification()
  const [jsonContent, setJsonContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      notify.error('请选择JSON文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setJsonContent(event.target.result)
    }
    reader.onerror = () => {
      notify.error('文件读取失败')
    }
    reader.readAsText(file)
  }

  const formatJson = () => {
    if (!jsonContent.trim()) {
      notify.error('内容为空')
      return
    }
    try {
      setJsonContent(JSON.stringify(JSON.parse(jsonContent), null, 2))
    } catch {
      notify.error('JSON格式错误，无法格式化')
    }
  }

  const handleImport = async () => {
    if (!jsonContent.trim()) {
      notify.error('请输入或上传JSON内容')
      return
    }

    let data
    try {
      data = JSON.parse(jsonContent)
    } catch {
      notify.error('JSON格式错误')
      return
    }

    // Support array or single object
    const credentials = Array.isArray(data) ? data : [data]

    if (credentials.length === 0) {
      notify.error('没有找到有效的账户数据')
      return
    }

    setLoading(true)
    let successCount = 0
    let failCount = 0
    const errors = []

    for (const cred of credentials) {
      if (!cred.refreshToken) {
        failCount++
        errors.push(`账户缺少refreshToken字段`)
        continue
      }

      const payload = {
        refreshToken: cred.refreshToken,
        accessToken: cred.accessToken || '',
        clientId: cred.clientId || '',
        clientSecret: cred.clientSecret || '',
        authMethod: cred.authMethod || (cred.clientId ? 'idc' : 'social'),
        provider: cred.provider || 'BuilderId',
        region: cred.region || 'us-east-1'
      }

      try {
        const res = await fetch('/admin/api/auth/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password
          },
          body: JSON.stringify(payload)
        })
        const result = await res.json()
        if (result.success) {
          successCount++
        } else {
          failCount++
          errors.push(result.error || '导入失败')
        }
      } catch (e) {
        failCount++
        errors.push(e.message || '网络错误')
      }
    }

    setLoading(false)

    if (successCount > 0) {
      notify.success(`成功导入 ${successCount} 个账户${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
      setJsonContent('')
      onOpenChange(false)
      onSuccess()
    } else {
      notify.error(`导入失败：${errors[0] || '未知错误'}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto glass border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5 text-white" />
            </div>
            批量导入账户
          </DialogTitle>
          <DialogDescription>导入包含完整凭证的 JSON 文件</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">选择 JSON 文件</span>
                  </div>
                </Label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <span className="text-sm text-muted-foreground">或</span>
              <div className="flex-1 text-center text-sm text-muted-foreground">
                直接粘贴到下方
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="jsonContent">JSON 内容</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={formatJson}
                >
                  <Braces className="w-3 h-3 mr-1" />
                  格式化
                </Button>
              </div>
              <Textarea
                id="jsonContent"
                placeholder='粘贴或上传 JSON 内容...'
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">注意事项：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>必须包含 refreshToken 字段</li>
                  <li>如果是 IdC 认证，需要提供 clientId 和 clientSecret</li>
                  <li>Social 认证（Google/Github）只需要 refreshToken</li>
                  <li>导入时会自动刷新 token 并获取账户信息</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  开始导入
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
