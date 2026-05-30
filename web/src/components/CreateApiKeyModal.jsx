import { useState } from 'react'
import { useNotification } from './ui/notification'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Key, Loader2, Copy, CheckCircle2 } from 'lucide-react'

export default function CreateApiKeyModal({ open, onOpenChange, password, onSuccess }) {
  const notify = useNotification()
  const [name, setName] = useState('')
  const [tokenLimit, setTokenLimit] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      notify.error('请输入密钥名称')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/admin/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          name: name.trim(),
          tokenLimit: parseInt(tokenLimit) || 0,
          creditLimit: parseFloat(creditLimit) || 0
        })
      })
      const data = await res.json()
      if (data.key) {
        setCreatedKey(data.key)
        notify.success('API密钥创建成功')
        onSuccess()
      } else {
        notify.error('创建失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
        .then(() => notify.success('已复制到剪贴板'))
        .catch(() => notify.error('复制失败'))
    }
  }

  const handleClose = () => {
    setName('')
    setTokenLimit(0)
    setCreditLimit(0)
    setCreatedKey(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg glass border-2 border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
              <Key className="w-5 h-5 text-white" />
            </div>
            创建 API 密钥
          </DialogTitle>
          <DialogDescription>
            {createdKey ? '请妥善保存您的 API 密钥' : '为新的 API 密钥设置一个名称'}
          </DialogDescription>
        </DialogHeader>

        {!createdKey ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">密钥名称</Label>
              <Input
                id="keyName"
                type="text"
                placeholder="例如: 生产环境密钥"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreate()
                  }
                }}
                className="mt-2 border-2 focus:border-purple-500 dark:focus:border-purple-400"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                用于标识此密钥的用途，例如"开发环境"或"生产环境"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tokenLimit">Token 限额</Label>
                <Input
                  id="tokenLimit"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={tokenLimit}
                  onChange={(e) => setTokenLimit(e.target.value)}
                  className="mt-2 border-2 focus:border-purple-500 dark:focus:border-purple-400"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = 不限制</p>
              </div>
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
                  className="mt-2 border-2 focus:border-purple-500 dark:focus:border-purple-400"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = 不限制</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    创建密钥
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="font-semibold text-green-900 dark:text-green-100">密钥创建成功</p>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                请立即复制并保存您的 API 密钥。关闭此窗口后将无法再次查看。
              </p>
              <div className="bg-card rounded-lg p-3 border border-green-300 dark:border-green-700">
                <p className="text-xs text-muted-foreground mb-1">API 密钥</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono break-all text-foreground">
                    {createdKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
