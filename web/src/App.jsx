import { useState, useEffect } from 'react'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import LoginPage from './components/LoginPage'
import AccountsPanel from './components/AccountsPanel'
import ApiKeysPanel from './components/ApiKeysPanel'
import SettingsPanel from './components/SettingsPanel'
import AccountDetailModal from './components/AccountDetailModal'
import AddAccountModal from './components/AddAccountModal'
import ConfirmDialog from './components/ConfirmDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Button } from './components/ui/button'
import { LogOut } from 'lucide-react'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [accountDetail, setAccountDetail] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  })

  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password')
    if (savedPassword) {
      verifyPassword(savedPassword)
    }
  }, [])

  const verifyPassword = async (pwd) => {
    try {
      const res = await fetch('/admin/api/status', {
        headers: { 'X-Admin-Password': pwd }
      })
      if (res.ok) {
        localStorage.setItem('admin_password', pwd)
        setAuthenticated(true)
        setPassword(pwd)
        loadAccounts(pwd)
        loadApiKeys(pwd)
      }
    } catch (e) {
      console.error('Verification failed:', e)
    }
  }

  const handleLogin = async (pwd) => {
    try {
      const res = await fetch('/admin/api/status', {
        headers: { 'X-Admin-Password': pwd }
      })
      if (res.ok) {
        localStorage.setItem('admin_password', pwd)
        setAuthenticated(true)
        setPassword(pwd)
        loadAccounts(pwd)
        loadApiKeys(pwd)
      } else {
        toast.error('密码错误')
      }
    } catch (e) {
      toast.error('登录失败')
    }
  }

  const loadAccounts = async (pwd) => {
    setLoading(true)
    try {
      const res = await fetch('/admin/api/accounts', {
        headers: { 'X-Admin-Password': pwd || password }
      })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
      }
    } catch (e) {
      console.error('Failed to load accounts:', e)
      toast.error('加载账户失败')
    } finally {
      setLoading(false)
    }
  }

  const loadApiKeys = async (pwd) => {
    try {
      const res = await fetch('/admin/api/keys', {
        headers: { 'X-Admin-Password': pwd || password }
      })
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data || [])
      }
    } catch (e) {
      console.error('Failed to load API keys:', e)
    }
  }

  const handleLogout = () => {
    setConfirmDialog({
      open: true,
      title: '确认退出',
      description: '确定要退出登录吗？',
      onConfirm: () => {
        localStorage.removeItem('admin_password')
        setAuthenticated(false)
        setPassword('')
        setAccounts([])
        setApiKeys([])
        setConfirmDialog({ ...confirmDialog, open: false })
      }
    })
  }

  const toggleAccount = async (id, enabled) => {
    try {
      const res = await fetch(`/admin/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled: !enabled })
      })
      if (res.ok) {
        loadAccounts()
        toast.success('操作成功')
      } else {
        toast.error('操作失败')
      }
    } catch (e) {
      toast.error('操作失败')
    }
  }

  const refreshAccount = async (id) => {
    try {
      const res = await fetch(`/admin/api/accounts/${id}/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        loadAccounts()
        toast.success('刷新成功')
      } else {
        toast.error('刷新失败')
      }
    } catch (e) {
      toast.error('刷新失败')
    }
  }

  const deleteAccount = async (id) => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      description: '确定要删除此账户吗？此操作无法撤销。',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/admin/api/accounts/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': password }
          })
          if (res.ok) {
            loadAccounts()
            toast.success('删除成功')
          } else {
            toast.error('删除失败')
          }
        } catch (e) {
          toast.error('删除失败')
        }
        setConfirmDialog({ ...confirmDialog, open: false })
      }
    })
  }

  const handleBatchEnable = async (ids) => {
    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/admin/api/accounts/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Password': password
            },
            body: JSON.stringify({ enabled: true })
          })
        )
      )
      loadAccounts()
      toast.success(`已启用 ${ids.length} 个账户`)
    } catch (e) {
      toast.error('批量启用失败')
    }
  }

  const handleBatchDisable = async (ids) => {
    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/admin/api/accounts/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Password': password
            },
            body: JSON.stringify({ enabled: false })
          })
        )
      )
      loadAccounts()
      toast.success(`已禁用 ${ids.length} 个账户`)
    } catch (e) {
      toast.error('批量禁用失败')
    }
  }

  const handleBatchDelete = async (ids) => {
    setConfirmDialog({
      open: true,
      title: '确认批量删除',
      description: `确定要删除选中的 ${ids.length} 个账户吗？此操作无法撤销。`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await Promise.all(
            ids.map(id =>
              fetch(`/admin/api/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Password': password }
              })
            )
          )
          loadAccounts()
          toast.success(`已删除 ${ids.length} 个账户`)
        } catch (e) {
          toast.error('批量删除失败')
        }
        setConfirmDialog({ ...confirmDialog, open: false })
      }
    })
  }

  const showDetail = async (id) => {
    try {
      const res = await fetch(`/admin/api/accounts/${id}/full`, {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        setAccountDetail(data)
        setDetailOpen(true)
      } else {
        toast.error('加载详情失败')
      }
    } catch (e) {
      toast.error('加载详情失败')
    }
  }

  const createApiKey = async () => {
    const name = window.prompt('请输入API密钥名称')
    if (!name) return

    try {
      const res = await fetch('/admin/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.key) {
        loadApiKeys()
        toast.success('API密钥创建成功，请保存: ' + data.key, { duration: 10000 })
      } else {
        toast.error('创建失败')
      }
    } catch (e) {
      toast.error('创建失败')
    }
  }

  const deleteApiKey = async (id) => {
    setConfirmDialog({
      open: true,
      title: '确认删除',
      description: '确定要删除此API密钥吗？此操作无法撤销。',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/admin/api/keys/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': password }
          })
          if (res.ok) {
            loadApiKeys()
            toast.success('删除成功')
          } else {
            toast.error('删除失败')
          }
        } catch (e) {
          toast.error('删除失败')
        }
        setConfirmDialog({ ...confirmDialog, open: false })
      }
    })
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Kiro-Go
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="accounts">账户管理</TabsTrigger>
            <TabsTrigger value="apikeys">API密钥</TabsTrigger>
            <TabsTrigger value="settings">系统设置</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <AccountsPanel
              accounts={accounts}
              loading={loading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={() => loadAccounts()}
              onAdd={() => setAddOpen(true)}
              onToggle={toggleAccount}
              onRefreshAccount={refreshAccount}
              onDelete={deleteAccount}
              onShowDetail={showDetail}
              onBatchEnable={handleBatchEnable}
              onBatchDisable={handleBatchDisable}
              onBatchDelete={handleBatchDelete}
            />
          </TabsContent>

          <TabsContent value="apikeys">
            <ApiKeysPanel
              apiKeys={apiKeys}
              loading={loading}
              onCreate={createApiKey}
              onDelete={deleteApiKey}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel password={password} />
          </TabsContent>
        </Tabs>
      </main>

      <AccountDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        account={accountDetail}
      />

      <AddAccountModal
        open={addOpen}
        onOpenChange={setAddOpen}
        password={password}
        onSuccess={() => loadAccounts()}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />

      <Toaster />
    </div>
  )
}
