import { useState, useEffect } from 'react'
import { useNotification } from './ui/notification'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Key, Loader2, Save } from 'lucide-react'

export default function EditApiKeyModal({ open, onOpenChange, apiKey, password, onSuccess }) {
  const notify = useNotification()
  const [name, setName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [tokenLimit, setTokenLimit] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name || '')
      setEnabled(apiKey.enabled !== false)
      setTokenLimit(apiKey.tokenLimit || 0)
      setCreditLimit(apiKey.creditLimit || 0)
    }
  }, [apiKey])

  const handleSave = async () => {
    if (!name.trim()) {
      notify.error('请输入密钥名称')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/admin/api/api-keys/${apiKey.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          name: name.trim(),
          enabled,
          tokenLimit: parseInt(tokenLimit) || 0,
          creditLimit: parseFloat(creditLimit) || 0
        })
      })
      const data = await res.json()
      if (res.ok) {
        notify.success('保存成功')
        onSuccess()
        onOpenChange(false)
      } else {
        notify.error('保存失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!apiKey) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg glass border-2 border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-md">
              <Key className="w-5 h-5 text-white" />
            </div>
            编辑 API 密钥
          </DialogTitle>
          <DialogDescription>
            修改密钥配置信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 密钥名称 */}
          <div>
            <Label htmlFor="keyName">密钥名称</Label>
            <Input
              id="keyName"
              type="text"
              placeholder="例如: 生产环境密钥"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 border-2 focus:border-blue-500 dark:focus:border-blue-400"
              autoFocus
            />
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div>
              <Label htmlFor="enabled" className="cursor-pointer">启用状态</Label>
              <p className="text-xs text-muted-foreground mt-1">禁用后此密钥将无法使用</p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Token 限额 */}
          <div>
            <Label htmlFor="tokenLimit">Token 限额</Label>
            <Input
              id="tokenLimit"
              type="number"
              min="0"
              placeholder="0"
              value={tokenLimit}
              onChange={(e) => setTokenLimit(e.target.value)}
              className="mt-2 border-2 focus:border-blue-500 dark:focus:border-blue-400"
            />
            <p className="text-xs text-muted-foreground mt-1">累计 token 上限，0 表示不限制</p>
          </div>

          {/* Credit 限额 */}
          <div>
            <Label htmlFor="creditLimit">Credit 限额</Label>
            <Input
              id="creditLimit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="mt-2 border-2 focus:border-blue-500 dark:focus:border-blue-400"
            />
            <p className="text-xs text-muted-foreground mt-1">累计 credit 上限，0 表示不限制</p>
          </div>

          {/* 密钥 ID（只读） */}
          <div>
            <Label>密钥 ID</Label>
            <div className="mt-2 p-3 bg-muted/50 rounded-md">
              <code className="text-sm font-mono text-foreground break-all">{apiKey.id}</code>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
