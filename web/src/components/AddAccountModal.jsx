import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent } from './ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Upload, Loader2, Cloud, Building2, Cookie, HardDrive, Code, Globe, Braces } from 'lucide-react'
import { useNotification } from './ui/notification'

// AWS IAM Identity Center 支持的区域（OIDC 端点 https://oidc.{region}.amazonaws.com）
// 列表对齐 Kiro IDE 内置的 aws 商业分区（extension.js endpoints 元数据），description 取自源码原文。
const AWS_REGIONS = [
  { value: 'us-east-1', label: 'us-east-1 (US East, N. Virginia)' },
  { value: 'us-east-2', label: 'us-east-2 (US East, Ohio)' },
  { value: 'us-west-1', label: 'us-west-1 (US West, N. California)' },
  { value: 'us-west-2', label: 'us-west-2 (US West, Oregon)' },
  { value: 'af-south-1', label: 'af-south-1 (Africa, Cape Town)' },
  { value: 'ap-east-1', label: 'ap-east-1 (Asia Pacific, Hong Kong)' },
  { value: 'ap-east-2', label: 'ap-east-2 (Asia Pacific, Taipei)' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 (Asia Pacific, Tokyo)' },
  { value: 'ap-northeast-2', label: 'ap-northeast-2 (Asia Pacific, Seoul)' },
  { value: 'ap-northeast-3', label: 'ap-northeast-3 (Asia Pacific, Osaka)' },
  { value: 'ap-south-1', label: 'ap-south-1 (Asia Pacific, Mumbai)' },
  { value: 'ap-south-2', label: 'ap-south-2 (Asia Pacific, Hyderabad)' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1 (Asia Pacific, Singapore)' },
  { value: 'ap-southeast-2', label: 'ap-southeast-2 (Asia Pacific, Sydney)' },
  { value: 'ap-southeast-3', label: 'ap-southeast-3 (Asia Pacific, Jakarta)' },
  { value: 'ap-southeast-4', label: 'ap-southeast-4 (Asia Pacific, Melbourne)' },
  { value: 'ap-southeast-5', label: 'ap-southeast-5 (Asia Pacific, Malaysia)' },
  { value: 'ap-southeast-6', label: 'ap-southeast-6 (Asia Pacific, New Zealand)' },
  { value: 'ap-southeast-7', label: 'ap-southeast-7 (Asia Pacific, Thailand)' },
  { value: 'ca-central-1', label: 'ca-central-1 (Canada, Central)' },
  { value: 'ca-west-1', label: 'ca-west-1 (Canada West, Calgary)' },
  { value: 'eu-central-1', label: 'eu-central-1 (Europe, Frankfurt)' },
  { value: 'eu-central-2', label: 'eu-central-2 (Europe, Zurich)' },
  { value: 'eu-north-1', label: 'eu-north-1 (Europe, Stockholm)' },
  { value: 'eu-south-1', label: 'eu-south-1 (Europe, Milan)' },
  { value: 'eu-south-2', label: 'eu-south-2 (Europe, Spain)' },
  { value: 'eu-west-1', label: 'eu-west-1 (Europe, Ireland)' },
  { value: 'eu-west-2', label: 'eu-west-2 (Europe, London)' },
  { value: 'eu-west-3', label: 'eu-west-3 (Europe, Paris)' },
  { value: 'il-central-1', label: 'il-central-1 (Israel, Tel Aviv)' },
  { value: 'me-central-1', label: 'me-central-1 (Middle East, UAE)' },
  { value: 'me-south-1', label: 'me-south-1 (Middle East, Bahrain)' },
  { value: 'mx-central-1', label: 'mx-central-1 (Mexico, Central)' },
  { value: 'sa-east-1', label: 'sa-east-1 (South America, Sao Paulo)' },
]

export default function AddAccountModal({ open, onOpenChange, password, onSuccess }) {
  const notify = useNotification()
  const [activeTab, setActiveTab] = useState('builderid')
  const [loading, setLoading] = useState(false)

  // Builder ID OAuth
  const [builderIdData, setBuilderIdData] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  // IAM SSO
  const [iamStartUrl, setIamStartUrl] = useState('')
  const [iamRegion, setIamRegion] = useState('us-east-1')
  const [iamSessionId, setIamSessionId] = useState('')
  const [iamAuthUrl, setIamAuthUrl] = useState('')
  const [iamCallbackUrl, setIamCallbackUrl] = useState('')

  // SSO Token
  const [ssoTokens, setSsoTokens] = useState('')

  // Local Cache
  const [localProvider, setLocalProvider] = useState('BuilderId')
  const [tokenJson, setTokenJson] = useState('')
  const [clientJson, setClientJson] = useState('')

  // Credentials JSON
  const [credentialsJson, setCredentialsJson] = useState('')
  const [credentialsProvider, setCredentialsProvider] = useState('BuilderId')

  // Web Cookie
  const [refreshToken, setRefreshToken] = useState('')
  const [cookieProvider, setCookieProvider] = useState('Github')

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  // 1. AWS Builder ID OAuth
  const startBuilderIdLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/builderid/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ region: 'us-east-1' })
      })
      const data = await res.json()
      if (data.sessionId && data.userCode) {
        setBuilderIdData(data)
        notify.success('请在浏览器中完成授权')
        // Start polling
        const interval = setInterval(() => pollBuilderIdAuth(data.sessionId), 3000)
        setPollingInterval(interval)
      } else {
        notify.error('启动登录失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('启动登录失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const pollBuilderIdAuth = async (sessionId) => {
    try {
      const res = await fetch('/admin/api/auth/builderid/poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ sessionId })
      })
      const data = await res.json()
      if (data.completed && data.account) {
        if (pollingInterval) clearInterval(pollingInterval)
        setPollingInterval(null)
        notify.success('登录成功: ' + (data.account.email || data.account.id))
        resetForm()
        onOpenChange(false)
        onSuccess()
      } else if (data.error && !data.error.includes('pending') && !data.error.includes('authorization_pending') && !data.error.includes('slow_down')) {
        if (pollingInterval) clearInterval(pollingInterval)
        setPollingInterval(null)
        notify.error('登录失败: ' + data.error)
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  // 2. IAM Identity Center
  const startIamSso = async () => {
    if (!iamStartUrl.trim()) {
      notify.error('请输入Start URL')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/iam-sso/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ startUrl: iamStartUrl, region: iamRegion })
      })
      const data = await res.json()
      if (data.sessionId && data.authorizeUrl) {
        setIamSessionId(data.sessionId)
        setIamAuthUrl(data.authorizeUrl)
        notify.success('请在浏览器中完成登录，然后粘贴回调URL')
      } else {
        notify.error('启动SSO失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('启动SSO失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const completeIamSso = async () => {
    if (!iamCallbackUrl.trim()) {
      notify.error('请输入回调URL')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/iam-sso/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ sessionId: iamSessionId, callbackUrl: iamCallbackUrl })
      })
      const data = await res.json()
      if (data.success && data.account) {
        notify.success('导入成功: ' + (data.account.email || data.account.id))
        resetForm()
        onOpenChange(false)
        onSuccess()
      } else {
        notify.error('导入失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('导入失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. SSO Token
  const importSsoToken = async () => {
    if (!ssoTokens.trim()) {
      notify.error('请输入SSO Token')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/admin/api/auth/sso-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ bearerToken: ssoTokens, region: 'us-east-1' })
      })
      const data = await res.json()
      if (data.success && data.accounts) {
        notify.success(`成功导入 ${data.accounts.length} 个账户`)
        resetForm()
        onOpenChange(false)
        onSuccess()
      } else {
        notify.error('导入失败: ' + (data.error || '未知错误'))
      }
    } catch (e) {
      notify.error('导入失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // 格式化 JSON 输入框：解析后用 2 空格缩进重新序列化。
  // 空内容直接跳过，解析失败时提示并保持原文不动（不破坏用户已输入的内容）。
  const formatJson = (value, setValue) => {
    if (!value.trim()) {
      notify.error('内容为空')
      return
    }
    try {
      setValue(JSON.stringify(JSON.parse(value), null, 2))
    } catch {
      notify.error('JSON格式错误，无法格式化')
    }
  }

  // 4. Kiro Local Cache
  const importLocalCache = async () => {
    if (!tokenJson.trim()) {
      notify.error('请输入Token JSON')
      return
    }

    let tokenData
    try {
      tokenData = JSON.parse(tokenJson)
    } catch {
      notify.error('Token JSON格式错误')
      return
    }

    if (!tokenData.refreshToken) {
      notify.error('Token JSON缺少refreshToken字段')
      return
    }

    // 是否 social 账号优先看文件：social 的 kiro-auth-token.json 带 authMethod="social"
    // 且无对应 <clientIdHash>.json，不应强制要求 Client JSON。文件没说才回退到下拉。
    const fileAuthMethod = (tokenData.authMethod || '').toLowerCase()
    const fileProvider = tokenData.provider || localProvider
    const isSocial = fileAuthMethod === 'social' || fileProvider === 'Google' || fileProvider === 'Github'
    let clientData = null

    if (!isSocial) {
      if (!clientJson.trim()) {
        notify.error('请输入Client JSON')
        return
      }
      try {
        clientData = JSON.parse(clientJson)
      } catch {
        notify.error('Client JSON格式错误')
        return
      }
      if (!clientData.clientId || !clientData.clientSecret) {
        notify.error('Client JSON缺少clientId或clientSecret字段')
        return
      }
    }

    const payload = {
      refreshToken: tokenData.refreshToken,
      accessToken: tokenData.accessToken || '',
      clientId: clientData?.clientId || '',
      clientSecret: clientData?.clientSecret || '',
      // 文件字段优先，缺失再回退到下拉/推断：
      // kiro-auth-token.json 实际带有 region/provider/authMethod，应原样采用，
      // 否则 region 永远被后端兜底成 us-east-1、Enterprise 账号会被错标成 BuilderId。
      authMethod: tokenData.authMethod || (clientData ? 'idc' : 'social'),
      provider: tokenData.provider || localProvider,
      region: tokenData.region || 'us-east-1'
    }

    setLoading(true)
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
        notify.success('导入成功: ' + (data.account?.email || data.account?.id))
        resetForm()
        onOpenChange(false)
        onSuccess()
      } else {
        notify.error('导入失败: ' + data.error)
      }
    } catch (e) {
      notify.error('导入失败')
    } finally {
      setLoading(false)
    }
  }

  // 5. Credentials JSON
  const importCredentials = async () => {
    if (!credentialsJson.trim()) {
      notify.error('请输入Credentials JSON')
      return
    }

    let data
    try {
      data = JSON.parse(credentialsJson)
    } catch {
      notify.error('JSON格式错误')
      return
    }

    // Support array or single object
    const credentials = Array.isArray(data) ? data : [data]

    setLoading(true)
    let successCount = 0
    for (const cred of credentials) {
      if (!cred.refreshToken) continue

      const payload = {
        refreshToken: cred.refreshToken,
        accessToken: cred.accessToken || '',
        clientId: cred.clientId || '',
        clientSecret: cred.clientSecret || '',
        // 字段优先用 JSON 里的，缺失再回退（与本地缓存导入保持一致）
        authMethod: cred.authMethod || (cred.clientId ? 'idc' : 'social'),
        provider: cred.provider || credentialsProvider,
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
        if (result.success) successCount++
      } catch (e) {
        // Continue with next
      }
    }

    setLoading(false)
    if (successCount > 0) {
      notify.success(`成功导入 ${successCount} 个账户`)
      resetForm()
      onOpenChange(false)
      onSuccess()
    } else {
      notify.error('导入失败')
    }
  }

  // 6. Web Cookie
  const importWebCookie = async () => {
    if (!refreshToken.trim()) {
      notify.error('请输入RefreshToken')
      return
    }

    const payload = {
      refreshToken: refreshToken,
      accessToken: '',
      clientId: '',
      clientSecret: '',
      authMethod: 'social',
      provider: cookieProvider
    }

    setLoading(true)
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
        notify.success('导入成功: ' + (data.account?.email || data.account?.id))
        resetForm()
        onOpenChange(false)
        onSuccess()
      } else {
        notify.error('导入失败: ' + data.error)
      }
    } catch (e) {
      notify.error('导入失败')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setBuilderIdData(null)
    if (pollingInterval) clearInterval(pollingInterval)
    setPollingInterval(null)
    setIamStartUrl('')
    setIamRegion('us-east-1')
    setIamSessionId('')
    setIamAuthUrl('')
    setIamCallbackUrl('')
    setSsoTokens('')
    setTokenJson('')
    setClientJson('')
    setCredentialsJson('')
    setRefreshToken('')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5 text-white" />
            </div>
            添加账户
          </DialogTitle>
          <DialogDescription>选择一种方式导入 Kiro 账户</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="builderid" className="text-xs flex-shrink-0">
                <Cloud className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Builder ID</span>
                <span className="sm:hidden">Builder</span>
              </TabsTrigger>
              <TabsTrigger value="iam" className="text-xs flex-shrink-0">
                <Building2 className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">IAM SSO</span>
                <span className="sm:hidden">IAM</span>
              </TabsTrigger>
              <TabsTrigger value="sso" className="text-xs flex-shrink-0">
                <Cookie className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">SSO Token</span>
                <span className="sm:hidden">SSO</span>
              </TabsTrigger>
              <TabsTrigger value="local" className="text-xs flex-shrink-0">
                <HardDrive className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">本地缓存</span>
                <span className="sm:hidden">本地</span>
              </TabsTrigger>
              <TabsTrigger value="credentials" className="text-xs flex-shrink-0">
                <Code className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">JSON凭证</span>
                <span className="sm:hidden">JSON</span>
              </TabsTrigger>
              <TabsTrigger value="cookie" className="text-xs flex-shrink-0">
                <Globe className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Web Cookie</span>
                <span className="sm:hidden">Cookie</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. AWS Builder ID OAuth */}
          <TabsContent value="builderid" className="space-y-4">
            <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Cloud className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">AWS Builder ID OAuth</h3>
                      <p className="text-sm text-muted-foreground">
                        通过设备授权流程登录 AWS Builder ID 账户
                      </p>
                    </div>
                  </div>

                  {builderIdData ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                      <p className="text-sm font-medium mb-2">请访问以下网址并输入验证码：</p>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">验证码</Label>
                          <div className="flex gap-2">
                            <Input
                              value={builderIdData.userCode}
                              readOnly
                              className="font-mono text-lg font-bold text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(builderIdData.userCode)
                                notify.success('已复制验证码')
                              }}
                            >
                              复制
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">授权网址</Label>
                          <div className="flex gap-2">
                            <Input
                              value={builderIdData.verificationUri}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => window.open(builderIdData.verificationUri, '_blank')}
                            >
                              打开
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        正在等待授权完成...
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={startBuilderIdLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          启动中...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4 mr-2" />
                          开始登录
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. IAM Identity Center */}
          <TabsContent value="iam" className="space-y-4">
            <Card className="border-2 border-dashed border-orange-200 dark:border-orange-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">IAM Identity Center</h3>
                      <p className="text-sm text-muted-foreground">
                        企业 SSO 登录方式
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="iamStartUrl">Start URL</Label>
                    <Input
                      id="iamStartUrl"
                      placeholder="https://xxx.awsapps.com/start"
                      value={iamStartUrl}
                      onChange={(e) => setIamStartUrl(e.target.value)}
                      className="font-mono text-sm"
                      disabled={!!iamAuthUrl}
                    />
                  </div>

                  <div>
                    <Label htmlFor="iamRegion">区域 (Region)</Label>
                    <Select value={iamRegion} onValueChange={setIamRegion} disabled={!!iamAuthUrl}>
                      <SelectTrigger id="iamRegion" className="font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AWS_REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="font-mono text-sm">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!iamAuthUrl ? (
                    <Button
                      onClick={startIamSso}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          启动中...
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4 mr-2" />
                          启动SSO登录
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                        <p className="text-sm font-medium mb-2">请在浏览器中完成登录：</p>
                        <Button
                          onClick={() => window.open(iamAuthUrl, '_blank')}
                          variant="outline"
                          className="w-full mb-3"
                        >
                          打开登录页面
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          登录完成后，复制浏览器地址栏的完整URL并粘贴到下方
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="iamCallbackUrl">回调 URL</Label>
                        <Textarea
                          id="iamCallbackUrl"
                          placeholder="https://..."
                          value={iamCallbackUrl}
                          onChange={(e) => setIamCallbackUrl(e.target.value)}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </div>

                      <Button
                        onClick={completeIamSso}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            完成中...
                          </>
                        ) : (
                          <>
                            <Building2 className="w-4 h-4 mr-2" />
                            完成登录
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. SSO Token */}
          <TabsContent value="sso" className="space-y-4">
            <Card className="border-2 border-dashed border-green-200 dark:border-green-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Cookie className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">SSO Token</h3>
                      <p className="text-sm text-muted-foreground">
                        从浏览器 Cookie 中提取 x-amz-sso_authn token，支持批量导入
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ssoTokens">SSO Tokens（每行一个）</Label>
                    <Textarea
                      id="ssoTokens"
                      placeholder="eyJhbGc...&#10;eyJhbGc..."
                      value={ssoTokens}
                      onChange={(e) => setSsoTokens(e.target.value)}
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      从浏览器开发者工具 → Application → Cookies 中复制
                    </p>
                  </div>

                  <Button
                    onClick={importSsoToken}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Cookie className="w-4 h-4 mr-2" />
                        导入 Token
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Kiro Local Cache */}
          <TabsContent value="local" className="space-y-4">
            <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <HardDrive className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Kiro 本地缓存</h3>
                      <p className="text-sm text-muted-foreground">
                        导入 kiro-auth-token.json 和客户端配置文件
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="localProvider">提供商</Label>
                    <Select value={localProvider} onValueChange={setLocalProvider}>
                      <SelectTrigger id="localProvider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BuilderId">BuilderId</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Github">Github</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tokenJson">Token JSON (kiro-auth-token.json)</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => formatJson(tokenJson, setTokenJson)}
                      >
                        <Braces className="w-3 h-3 mr-1" />
                        格式化
                      </Button>
                    </div>
                    <Textarea
                      id="tokenJson"
                      placeholder='{"refreshToken":"...", "accessToken":"..."}'
                      value={tokenJson}
                      onChange={(e) => setTokenJson(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>

                  {localProvider !== 'Google' && localProvider !== 'Github' && (
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="clientJson">Client JSON (IdC 认证必需)</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => formatJson(clientJson, setClientJson)}
                        >
                          <Braces className="w-3 h-3 mr-1" />
                          格式化
                        </Button>
                      </div>
                      <Textarea
                        id="clientJson"
                        placeholder='{"clientId":"...", "clientSecret":"..."}'
                        value={clientJson}
                        onChange={(e) => setClientJson(e.target.value)}
                        rows={6}
                        className="font-mono text-xs"
                      />
                    </div>
                  )}

                  <Button
                    onClick={importLocalCache}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-4 h-4 mr-2" />
                        导入账户
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Credentials JSON */}
          <TabsContent value="credentials" className="space-y-4">
            <Card className="border-2 border-dashed border-cyan-200 dark:border-cyan-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Credentials JSON</h3>
                      <p className="text-sm text-muted-foreground">
                        导入包含 refreshToken 的 JSON 对象或数组，支持批量导入
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="credentialsProvider">默认提供商</Label>
                    <Select value={credentialsProvider} onValueChange={setCredentialsProvider}>
                      <SelectTrigger id="credentialsProvider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BuilderId">BuilderId</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Github">Github</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="credentialsJson">Credentials JSON</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => formatJson(credentialsJson, setCredentialsJson)}
                      >
                        <Braces className="w-3 h-3 mr-1" />
                        格式化
                      </Button>
                    </div>
                    <Textarea
                      id="credentialsJson"
                      placeholder='{"refreshToken":"...", "provider":"BuilderId"}&#10;或&#10;[{"refreshToken":"..."}, ...]'
                      value={credentialsJson}
                      onChange={(e) => setCredentialsJson(e.target.value)}
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      支持单个对象或数组格式，可包含 provider、clientId、clientSecret 字段
                    </p>
                  </div>

                  <Button
                    onClick={importCredentials}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Code className="w-4 h-4 mr-2" />
                        导入凭证
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. Kiro Web Cookie */}
          <TabsContent value="cookie" className="space-y-4">
            <Card className="border-2 border-dashed border-pink-200 dark:border-pink-800 glass">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-md flex-shrink-0">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Kiro Web Cookie</h3>
                      <p className="text-sm text-muted-foreground">
                        从 https://app.kiro.dev 提取 RefreshToken
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cookieProvider">提供商</Label>
                    <Select value={cookieProvider} onValueChange={setCookieProvider}>
                      <SelectTrigger id="cookieProvider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Github">Github</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="refreshToken">RefreshToken</Label>
                    <Textarea
                      id="refreshToken"
                      placeholder="从浏览器 Cookies 中复制 RefreshToken 的值"
                      value={refreshToken}
                      onChange={(e) => setRefreshToken(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      打开 https://app.kiro.dev → 开发者工具 → Application → Cookies → RefreshToken
                    </p>
                  </div>

                  <Button
                    onClick={importWebCookie}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        导入账户
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
