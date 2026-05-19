import { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Label } from './components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { RefreshCw, Trash2, Power, Plus, Search } from 'lucide-react'

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

  // 添加账户表单
  const [addMethod, setAddMethod] = useState('local')
  const [provider, setProvider] = useState('BuilderId')
  const [tokenJson, setTokenJson] = useState('')
  const [clientJson, setClientJson] = useState('')

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

  const handleLogin = async () => {
    try {
      const res = await fetch('/admin/api/status', {
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        localStorage.setItem('admin_password', password)
        setAuthenticated(true)
        loadAccounts(password)
        loadApiKeys(password)
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
    localStorage.removeItem('admin_password')
    setAuthenticated(false)
    setPassword('')
    setAccounts([])
    setApiKeys([])
  }

  const toggleAccount = async (id, enabled) => {
    try {
      const res = await fetch(`/admin/api/accounts/${id}`, {
        method: 'PATCH',
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
    if (!window.confirm('确定要删除此账户吗？')) return
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

  const handleAddAccount = async () => {
    if (addMethod === 'local') {
      await importLocalAccount()
    }
  }

  const importLocalAccount = async () => {
    if (!tokenJson.trim()) {
      toast.error('请输入Token JSON')
      return
    }

    let tokenData
    try {
      tokenData = JSON.parse(tokenJson)
    } catch {
      toast.error('Token JSON格式错误')
      return
    }

    if (!tokenData.refreshToken) {
      toast.error('Token JSON缺少refreshToken字段')
      return
    }

    const isSocial = provider === 'Google' || provider === 'Github'
    let clientData = null

    if (!isSocial) {
      if (!clientJson.trim()) {
        toast.error('请输入Client JSON')
        return
      }
      try {
        clientData = JSON.parse(clientJson)
      } catch {
        toast.error('Client JSON格式错误')
        return
      }
      if (!clientData.clientId || !clientData.clientSecret) {
        toast.error('Client JSON缺少clientId或clientSecret字段')
        return
      }
    }

    const payload = {
      refreshToken: tokenData.refreshToken,
      accessToken: tokenData.accessToken || '',
      clientId: clientData?.clientId || '',
      clientSecret: clientData?.clientSecret || '',
      authMethod: clientData ? 'idc' : 'social',
      provider: provider
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
      const data = await res.json()
      if (data.success) {
        setAddOpen(false)
        setTokenJson('')
        setClientJson('')
        loadAccounts()
        toast.success('导入成功: ' + (data.account?.email || data.account?.id))
      } else {
        toast.error('导入失败: ' + data.error)
      }
    } catch (e) {
      toast.error('导入失败')
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
    if (!window.confirm('确定要删除此API密钥吗？')) return
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
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '从未'
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  const getSubBadge = (type) => {
    const badges = {
      'Free': 'bg-gray-100 text-gray-800',
      'Pro': 'bg-blue-100 text-blue-800',
      'Pro_Plus': 'bg-purple-100 text-purple-800',
      'Power': 'bg-orange-100 text-orange-800'
    }
    return badges[type] || badges['Free']
  }

  const filteredAccounts = accounts.filter(acc =>
    !searchTerm ||
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Kiro-Go
            </CardTitle>
            <CardDescription>管理面板</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="请输入管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Kiro-Go
          </h1>
          <Button variant="destructive" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="accounts">
              账户管理
            </TabsTrigger>
            <TabsTrigger value="apikeys">
              API密钥
            </TabsTrigger>
            <TabsTrigger value="settings">
              系统设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">账户列表</h2>
                <p className="text-sm text-muted-foreground">共 {filteredAccounts.length} 个账户</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索账户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button onClick={() => loadAccounts()} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加账户
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                加载中...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {searchTerm ? '未找到匹配的账户' : '暂无账户'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAccounts.map((account) => (
                  <Card key={account.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {account.nickname || account.email}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSubBadge(account.subscriptionType)}`}>
                              {account.subscriptionType || 'Free'}
                            </span>
                            {account.enabled ? (
                              <span className="text-green-600 text-xs">✓ 已启用</span>
                            ) : (
                              <span className="text-gray-400 text-xs">✗ 已禁用</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{account.email}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>认证: {account.authMethod === 'idc' ? 'IdC' : 'Social'}</span>
                            <span>请求: {account.requestCount || 0}</span>
                            <span>最后使用: {formatDate(account.lastUsed)}</span>
                          </div>
                          {account.usageCurrent !== undefined && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>用量</span>
                                <span>{account.usageCurrent?.toFixed(2)} / {account.usageLimit?.toFixed(2)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-purple-600 h-1.5 rounded-full"
                                  style={{ width: `${Math.min((account.usageCurrent / account.usageLimit) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showDetail(account.id)}
                          >
                            详情
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshAccount(account.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAccount(account.id, account.enabled)}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteAccount(account.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="apikeys">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">API密钥管理</h2>
                <p className="text-sm text-muted-foreground">共 {apiKeys.length} 个密钥</p>
              </div>
              <Button onClick={createApiKey}>
                <Plus className="w-4 h-4 mr-2" />
                创建密钥
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  暂无API密钥
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <Card key={key.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{key.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            创建时间: {formatDate(key.createdAt)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            最后使用: {formatDate(key.lastUsed)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>系统设置</CardTitle>
                <CardDescription>配置系统参数</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 账户详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>账户详情</DialogTitle>
            <DialogDescription>
              {accountDetail?.email}
            </DialogDescription>
          </DialogHeader>
          {accountDetail && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">基本信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>ID: {accountDetail.id}</div>
                  <div>昵称: {accountDetail.nickname || '-'}</div>
                  <div>邮箱: {accountDetail.email}</div>
                  <div>用户ID: {accountDetail.userId || '-'}</div>
                  <div>认证方式: {accountDetail.authMethod}</div>
                  <div>提供商: {accountDetail.provider || '-'}</div>
                  <div>区域: {accountDetail.region}</div>
                  <div>状态: {accountDetail.enabled ? '已启用' : '已禁用'}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">使用统计</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>请求次数: {accountDetail.requestCount || 0}</div>
                  <div>错误次数: {accountDetail.errorCount || 0}</div>
                  <div>最后使用: {formatDate(accountDetail.lastUsed)}</div>
                  <div>最后刷新: {formatDate(accountDetail.lastRefresh)}</div>
                </div>
              </div>

              {accountDetail.availableModels && accountDetail.availableModels.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">可用模型</h3>
                  <div className="flex flex-wrap gap-2">
                    {accountDetail.availableModels.map((model) => (
                      <span key={model} className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 添加账户弹窗 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加账户</DialogTitle>
            <DialogDescription>导入Kiro账户凭证</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>导入方式</Label>
              <Select value={addMethod} onValueChange={setAddMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">本地导入</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addMethod === 'local' && (
              <>
                <div>
                  <Label>提供商</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BuilderId">BuilderId</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Github">Github</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Token JSON</Label>
                  <Textarea
                    placeholder='{"refreshToken":"...", "accessToken":"..."}'
                    value={tokenJson}
                    onChange={(e) => setTokenJson(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                {provider !== 'Google' && provider !== 'Github' && (
                  <div>
                    <Label>Client JSON (IdC认证需要)</Label>
                    <Textarea
                      placeholder='{"clientId":"...", "clientSecret":"..."}'
                      value={clientJson}
                      onChange={(e) => setClientJson(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                <Button onClick={handleAddAccount} className="w-full">
                  导入账户
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
