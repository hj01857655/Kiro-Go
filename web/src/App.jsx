import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NotificationProvider, useNotification } from './components/ui/notification'
import { ThemeProvider, useTheme } from './components/ThemeProvider'
import { ThemeToggle } from './components/ThemeToggle'
import LoginPage from './components/LoginPage'
import DashboardPanel from './components/DashboardPanel'
import AccountsPanel from './components/AccountsPanel'
import ApiKeysPanel from './components/ApiKeysPanel'
import LogsPanel from './components/LogsPanel'
import AuditLogsPanel from './components/AuditLogsPanel'
import SettingsPanel from './components/SettingsPanel'
import AccountDetailModal from './components/AccountDetailModal'
import AddAccountModal from './components/AddAccountModal'
import CreateApiKeyModal from './components/CreateApiKeyModal'
import EditApiKeyModal from './components/EditApiKeyModal'
import ConfirmDialog from './components/ConfirmDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Button } from './components/ui/button'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from './components/ui/navigation-menu'
import { LogOut, Languages } from 'lucide-react'

function AppContent() {
  const { t, i18n } = useTranslation()
  const notify = useNotification()
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard'
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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  })


  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_password')
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
        sessionStorage.setItem('admin_password', pwd)
        setAuthenticated(true)
        setPassword(pwd)
        loadAccounts(pwd)
        loadApiKeys(pwd)
      } else {
        sessionStorage.removeItem('admin_password')
      }
    } catch (e) {
      console.error('Verification failed:', e)
      sessionStorage.removeItem('admin_password')
    }
  }

  const handleLogin = async (pwd) => {
    try {
      const res = await fetch('/admin/api/status', {
        headers: { 'X-Admin-Password': pwd }
      })
      if (res.ok) {
        sessionStorage.setItem('admin_password', pwd)
        setAuthenticated(true)
        setPassword(pwd)
        loadAccounts(pwd)
        loadApiKeys(pwd)
      } else {
        notify.error(t('messages.loginError'))
      }
    } catch (e) {
      notify.error(t('messages.loginFailed'))
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
        setAccounts(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Failed to load accounts:', e)
      notify.error(t('messages.loadAccountsError'))
    } finally {
      setLoading(false)
    }
  }

  const loadApiKeys = async (pwd) => {
    try {
      const res = await fetch('/admin/api/api-keys', {
        headers: { 'X-Admin-Password': pwd || password }
      })
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.apiKeys || [])
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
        sessionStorage.removeItem('admin_password')
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
        notify.success(t('messages.operationSuccess'))
      } else {
        // 失败时回滚
        setAccounts(prev => prev.map(acc =>
          acc.id === id ? { ...acc, enabled: enabled } : acc
        ))
        notify.error(t('messages.operationFailed'))
      }
    } catch (e) {
      // 失败时回滚
      setAccounts(prev => prev.map(acc =>
        acc.id === id ? { ...acc, enabled: enabled } : acc
      ))
      notify.error(t('messages.operationFailed'))
    }
  }

  const refreshAccount = async (id) => {
    try {
      const res = await fetch(`/admin/api/accounts/${id}/refresh`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        // 刷新接口返回的是扁平的 AccountInfo（非完整账号），
        // 直接重新拉取列表，拿到规范化后的完整记录更新卡片。
        await loadAccounts()
        notify.success(t('messages.refreshSuccess'))
      } else {
        notify.error(t('messages.refreshFailed'))
      }
    } catch (e) {
      notify.error(t('messages.refreshFailed'))
    }
  }

  const deleteAccount = async (id) => {
    setConfirmDialog({
      open: true,
      title: t('confirm.deleteAccount.title'),
      description: t('confirm.deleteAccount.description'),
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
            notify.success(t('messages.deleteSuccess'))
          } else {
            notify.error(t('messages.deleteFailed'))
          }
        } catch (e) {
          notify.error(t('messages.deleteFailed'))
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
      notify.success(t('messages.batchEnabled', { count: ids.length }))
    } catch (e) {
      // 失败时重新加载
      loadAccounts()
      notify.error(t('messages.batchEnableFailed'))
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
      notify.success(t('messages.batchDisabled', { count: ids.length }))
    } catch (e) {
      // 失败时重新加载
      loadAccounts()
      notify.error(t('messages.batchDisableFailed'))
    }
  }

  const handleBatchDelete = async (ids) => {
    setConfirmDialog({
      open: true,
      title: t('confirm.batchDelete.title'),
      description: t('confirm.batchDelete.description', { count: ids.length }),
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
          notify.success(t('messages.batchDeleted', { count: ids.length }))
        } catch (e) {
          notify.error(t('messages.batchDeleteFailed'))
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
    notify.success(t('messages.exportSuccess'))
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
    notify.success(t('messages.exportSuccess'))
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
        notify.error(t('messages.loadDetailError'))
      }
    } catch (e) {
      notify.error(t('messages.loadDetailError'))
    }
  }


  const deleteApiKey = async (id) => {
    setConfirmDialog({
      open: true,
      title: t('confirm.deleteApiKey.title'),
      description: t('confirm.deleteApiKey.description'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/admin/api/api-keys/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': password }
          })
          if (res.ok) {
            // 从列表中移除
            setApiKeys(prev => prev.filter(key => key.id !== id))
            notify.success(t('messages.deleteSuccess'))
          } else {
            notify.error(t('messages.deleteFailed'))
          }
        } catch (e) {
          notify.error(t('messages.deleteFailed'))
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
      const res = await fetch(`/admin/api/api-keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ enabled: !currentEnabled })
      })
      if (res.ok) {
        notify.success(currentEnabled ? t('messages.apiKeyDisabled') : t('messages.apiKeyEnabled'))
      } else {
        // 失败时回滚
        setApiKeys(prev => prev.map(key =>
          key.id === id ? { ...key, enabled: currentEnabled } : key
        ))
        notify.error(t('messages.operationFailed'))
      }
    } catch (e) {
      // 失败时回滚
      setApiKeys(prev => prev.map(key =>
        key.id === id ? { ...key, enabled: currentEnabled } : key
      ))
      notify.error(t('messages.operationFailed'))
    }
  }

  // 重置单个密钥的累计用量（tokens/credits/requests 清零）
  const resetApiKeyUsage = async (id) => {
    try {
      const res = await fetch(`/admin/api/api-keys/${id}/reset-usage`, {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        await loadApiKeys()
        notify.success(t('messages.resetUsageSuccess'))
      } else {
        notify.error(t('messages.resetUsageFailed'))
      }
    } catch (e) {
      notify.error(t('messages.resetUsageFailed'))
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
                    setActiveTab('dashboard')
                    localStorage.setItem('activeTab', 'dashboard')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'dashboard'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {t('nav.dashboard')}
                </button>
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
                  {t('nav.accounts')}
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
                  {t('nav.apiKeys')}
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
                  {t('nav.logs')}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('audit')
                    localStorage.setItem('activeTab', 'audit')
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === 'audit'
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {t('nav.auditLogs')}
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
                  {t('nav.settings')}
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={toggleLanguage}
                className="border-2 dark:border-slate-600 dark:text-slate-200 transition-colors"
                title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                <Languages className="w-4 h-4 mr-2" />
                {i18n.language === 'zh' ? 'EN' : '中文'}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-2 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-300 dark:border-slate-600 dark:text-slate-200 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('app.logout')}
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

          <TabsContent value="dashboard">
            <DashboardPanel
              password={password}
              accounts={accounts}
              apiKeys={apiKeys}
            />
          </TabsContent>

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
              onResetUsage={resetApiKeyUsage}
              onEdit={editApiKey}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel password={password} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsPanel password={password} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsPanel password={password} />
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
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="kiro-theme">
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  )
}
