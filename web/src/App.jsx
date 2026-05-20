import { useState, useEffect, useRef } from 'react'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { ThemeProvider, useTheme } from './components/ThemeProvider'
import { ThemeToggle } from './components/ThemeToggle'
import LoginPage from './components/LoginPage'
import AccountsPanel from './components/AccountsPanel'
import ApiKeysPanel from './components/ApiKeysPanel'
import LogsPanel from './components/LogsPanel'
import SettingsPanel from './components/SettingsPanel'
import AccountDetailModal from './components/AccountDetailModal'
import AddAccountModal from './components/AddAccountModal'
import CreateApiKeyModal from './components/CreateApiKeyModal'
import EditApiKeyModal from './components/EditApiKeyModal'
import ConfirmDialog from './components/ConfirmDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Button } from './components/ui/button'
import { LogOut } from 'lucide-react'

function AppContent() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'accounts'
  })
  const [accounts, setAccounts] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [createKeyOpen, setCreateKeyOpen] = useState(false)
  const [editKeyOpen, setEditKeyOpen] = useState(false)
  const [accountDetail, setAccountDetail] = useState(null)
  const [editingKey, setEditingKey] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const searchInputRef = useRef(null)
  const { setTheme } = useTheme()

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
    // 乐观更新：先更新本地状态
    setAccounts(prev => prev.map(acc =>
      acc.id === id ? { ...acc, enabled: !enabled } : acc
    ))

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
        toast.success('操作成功')
      } else {
        // 失败时回滚
        setAccounts(prev => prev.map(acc =>
          acc.id === id ? { ...acc, enabled: enabled } : acc
        ))
        toast.error('操作失败')
      }
    } catch (e) {
      // 失败时回滚
      setAccounts(prev => prev.map(acc =>
        acc.id === id ? { ...acc, enabled: enabled } : acc
      ))
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
        const data = await res.json()
        // 后端现在返回 { success: true, account: {...} }，包含完整的账户数据
        if (data.success && data.account) {
          setAccounts(prev => prev.map(acc =>
            acc.id === id ? data.account : acc
          ))
          toast.success('刷新成功')
        } else {
          toast.success('刷新成功')
        }
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
            // 从列表中移除
            setAccounts(prev => prev.filter(acc => acc.id !== id))
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
    // 乐观更新
    setAccounts(prev => prev.map(acc =>
      ids.includes(acc.id) ? { ...acc, enabled: true } : acc
    ))

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
      toast.success(`已启用 ${ids.length} 个账户`)
    } catch (e) {
      // 失败时重新加载
      loadAccounts()
      toast.error('批量启用失败')
    }
  }

  const handleBatchDisable = async (ids) => {
    // 乐观更新
    setAccounts(prev => prev.map(acc =>
      ids.includes(acc.id) ? { ...acc, enabled: false } : acc
    ))

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
      toast.success(`已禁用 ${ids.length} 个账户`)
    } catch (e) {
      // 失败时重新加载
      loadAccounts()
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
          // 从列表中移除
          setAccounts(prev => prev.filter(acc => !ids.includes(acc.id)))
          setSelectedAccounts([])
          toast.success(`已删除 ${ids.length} 个账户`)
        } catch (e) {
          toast.error('批量删除失败')
        }
        setConfirmDialog({ ...confirmDialog, open: false })
      }
    })
  }

  const handleExportJSON = () => {
    const dataToExport = accounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      enabled: acc.enabled,
      status: acc.status,
      created_at: acc.created_at,
      last_used: acc.last_used
    }))

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Email', 'Enabled', 'Status', 'Created At', 'Last Used']
    const rows = accounts.map(acc => [
      acc.id,
      acc.email,
      acc.enabled ? 'Yes' : 'No',
      acc.status,
      acc.created_at || '',
      acc.last_used || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
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
            // 从列表中移除
            setApiKeys(prev => prev.filter(key => key.id !== id))
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

  const toggleApiKey = async (id, currentEnabled) => {
    // 乐观更新：先更新本地状态
    setApiKeys(prev => prev.map(key =>
      key.id === id ? { ...key, enabled: !currentEnabled } : key
    ))

    try {
      const res = await fetch(`/admin/api/keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled: !currentEnabled })
      })
      if (res.ok) {
        toast.success(currentEnabled ? '已禁用' : '已启用')
      } else {
        // 失败时回滚
        setApiKeys(prev => prev.map(key =>
          key.id === id ? { ...key, enabled: currentEnabled } : key
        ))
        toast.error('操作失败')
      }
    } catch (e) {
      // 失败时回滚
      setApiKeys(prev => prev.map(key =>
        key.id === id ? { ...key, enabled: currentEnabled } : key
      ))
      toast.error('操作失败')
    }
  }

  const refreshApiKey = async (id) => {
    try {
      const res = await fetch(`/admin/api/keys/${id}/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        const data = await res.json()
        // 更新本地状态中的密钥
        setApiKeys(prev => prev.map(key =>
          key.id === id ? { ...key, key: data.key } : key
        ))
        toast.success('刷新成功')
      } else {
        toast.error('刷新失败')
      }
    } catch (e) {
      toast.error('刷新失败')
    }
  }

  const testApiKey = async (id) => {
    toast.info('正在测试连接...')
    try {
      const res = await fetch(`/admin/api/keys/${id}/test`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`测试成功 - 响应时间: ${data.responseTime}ms`)
      } else {
        toast.error('测试失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      toast.error('测试失败')
    }
  }

  const editApiKey = (key) => {
    setEditingKey(key)
    setEditKeyOpen(true)
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-950">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-lg backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <h1 className="text-xl font-bold text-gradient">
                  Kiro-Go
                </h1>
              </div>

              <nav className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setActiveTab('accounts')
                    localStorage.setItem('activeTab', 'accounts')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'accounts'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  账户管理
                </button>
                <button
                  onClick={() => {
                    setActiveTab('apikeys')
                    localStorage.setItem('activeTab', 'apikeys')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'apikeys'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  API密钥
                </button>
                <button
                  onClick={() => {
                    setActiveTab('logs')
                    localStorage.setItem('activeTab', 'logs')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'logs'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  请求日志
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings')
                    localStorage.setItem('activeTab', 'settings')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'settings'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  系统设置
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-2 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-300 dark:border-slate-600 dark:text-slate-200 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            localStorage.setItem('activeTab', value)
          }}
          className="space-y-6"
        >

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
              searchInputRef={searchInputRef}
              selectedAccounts={selectedAccounts}
              onSelectedAccountsChange={setSelectedAccounts}
              password={password}
            />
          </TabsContent>

          <TabsContent value="apikeys">
            <ApiKeysPanel
              apiKeys={apiKeys}
              loading={loading}
              onCreate={() => setCreateKeyOpen(true)}
              onDelete={deleteApiKey}
              onToggle={toggleApiKey}
              onRefresh={refreshApiKey}
              onTest={testApiKey}
              onEdit={editApiKey}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel password={password} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsPanel password={password} />
          </TabsContent>
        </Tabs>
      </main>

      <AccountDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        account={accountDetail}
        password={password}
        onRefresh={loadAccounts}
      />

      <AddAccountModal
        open={addOpen}
        onOpenChange={setAddOpen}
        password={password}
        onSuccess={() => loadAccounts()}
      />

      <CreateApiKeyModal
        open={createKeyOpen}
        onOpenChange={setCreateKeyOpen}
        password={password}
        onSuccess={() => loadApiKeys()}
      />

      <EditApiKeyModal
        open={editKeyOpen}
        onOpenChange={setEditKeyOpen}
        apiKey={editingKey}
        password={password}
        onSuccess={() => loadApiKeys()}
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

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="kiro-theme">
      <AppContent />
    </ThemeProvider>
  )
}
