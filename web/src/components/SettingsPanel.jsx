import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { toast } from 'sonner'
import { Trash2, Plus } from 'lucide-react'

export default function SettingsPanel({ password }) {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    port: 8080,
    host: '127.0.0.1',
    password: '',
    apiKey: '',
    apiKeyRequired: false,
    proxyURL: ''
  })

  const [thinking, setThinking] = useState({
    suffix: '-thinking',
    openaiFormat: '',
    claudeFormat: ''
  })

  const [endpoint, setEndpoint] = useState({
    preferred: '',
    enableFallback: true
  })

  const [promptFilter, setPromptFilter] = useState({
    filterClaudeCode: false,
    filterEnvNoise: false,
    filterStripBoundaries: false,
    rules: []
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // 加载基础设置
      const settingsRes = await fetch('/admin/api/settings', {
        headers: { 'X-Admin-Password': password }
      })
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings({
          port: data.port || 8080,
          host: data.host || '127.0.0.1',
          password: '',
          apiKey: data.apiKey || '',
          apiKeyRequired: data.apiKeyRequired || false,
          proxyURL: data.proxyURL || ''
        })
      }

      // 加载 thinking 配置
      const thinkingRes = await fetch('/admin/api/thinking', {
        headers: { 'X-Admin-Password': password }
      })
      if (thinkingRes.ok) {
        const data = await thinkingRes.json()
        setThinking(data)
      }

      // 加载 endpoint 配置
      const endpointRes = await fetch('/admin/api/endpoint', {
        headers: { 'X-Admin-Password': password }
      })
      if (endpointRes.ok) {
        const data = await endpointRes.json()
        setEndpoint(data)
      }

      // 加载 prompt filter 配置
      const filterRes = await fetch('/admin/api/prompt-filter', {
        headers: { 'X-Admin-Password': password }
      })
      if (filterRes.ok) {
        const data = await filterRes.json()
        setPromptFilter(data)
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
      toast.error('加载设置失败')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // 保存基础设置
      await fetch('/admin/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(settings)
      })

      // 保存 thinking 配置
      await fetch('/admin/api/thinking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(thinking)
      })

      // 保存 endpoint 配置
      await fetch('/admin/api/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(endpoint)
      })

      // 保存 prompt filter 配置
      await fetch('/admin/api/prompt-filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(promptFilter)
      })

      toast.success('设置保存成功')
    } catch (e) {
      toast.error('设置保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const addRule = () => {
    setPromptFilter({
      ...promptFilter,
      rules: [...promptFilter.rules, { type: 'regex', match: '', replace: '' }]
    })
  }

  const removeRule = (idx) => {
    setPromptFilter({
      ...promptFilter,
      rules: promptFilter.rules.filter((_, i) => i !== idx)
    })
  }

  const updateRule = (idx, field, value) => {
    const newRules = [...promptFilter.rules]
    newRules[idx] = { ...newRules[idx], [field]: value }
    setPromptFilter({ ...promptFilter, rules: newRules })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 基础设置 */}
      <Card>
        <CardHeader>
          <CardTitle>基础设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="port">服务器端口</Label>
            <Input
              id="port"
              type="number"
              placeholder="8080"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="host">服务器主机</Label>
            <Input
              id="host"
              type="text"
              placeholder="127.0.0.1"
              value={settings.host}
              onChange={(e) => setSettings({ ...settings, host: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="password">管理员密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="留空表示不修改"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="apiKey">API密钥</Label>
            <Input
              id="apiKey"
              type="text"
              placeholder="可选的API密钥"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">用于保护API访问</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="apiKeyRequired"
              checked={settings.apiKeyRequired}
              onCheckedChange={(checked) => setSettings({ ...settings, apiKeyRequired: checked })}
            />
            <Label htmlFor="apiKeyRequired" className="cursor-pointer">要求API密钥</Label>
          </div>
        </CardContent>
      </Card>

      {/* Proxy 设置 */}
      <Card>
        <CardHeader>
          <CardTitle>代理设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="proxyURL">全局代理URL</Label>
            <Input
              id="proxyURL"
              type="text"
              placeholder="http://127.0.0.1:7890"
              value={settings.proxyURL}
              onChange={(e) => setSettings({ ...settings, proxyURL: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">为所有账户设置全局代理</p>
          </div>
        </CardContent>
      </Card>

      {/* Thinking 配置 */}
      <Card>
        <CardHeader>
          <CardTitle>Thinking 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="thinkingSuffix">Thinking 后缀</Label>
            <Input
              id="thinkingSuffix"
              type="text"
              placeholder="-thinking"
              value={thinking.suffix}
              onChange={(e) => setThinking({ ...thinking, suffix: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">添加到模型名称的后缀以启用thinking</p>
          </div>
          <div>
            <Label htmlFor="openaiFormat">OpenAI 格式</Label>
            <Select
              value={thinking.openaiFormat}
              onValueChange={(value) => setThinking({ ...thinking, openaiFormat: value })}
            >
              <SelectTrigger id="openaiFormat">
                <SelectValue placeholder="无" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无</SelectItem>
                <SelectItem value="reasoning_content">reasoning_content</SelectItem>
                <SelectItem value="thinking">thinking</SelectItem>
                <SelectItem value="think">think</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="claudeFormat">Claude 格式</Label>
            <Select
              value={thinking.claudeFormat}
              onValueChange={(value) => setThinking({ ...thinking, claudeFormat: value })}
            >
              <SelectTrigger id="claudeFormat">
                <SelectValue placeholder="无" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无</SelectItem>
                <SelectItem value="reasoning_content">reasoning_content</SelectItem>
                <SelectItem value="thinking">thinking</SelectItem>
                <SelectItem value="think">think</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint 配置 */}
      <Card>
        <CardHeader>
          <CardTitle>端点设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="preferredEndpoint">首选端点</Label>
            <Select
              value={endpoint.preferred}
              onValueChange={(value) => setEndpoint({ ...endpoint, preferred: value })}
            >
              <SelectTrigger id="preferredEndpoint">
                <SelectValue placeholder="自动" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">自动</SelectItem>
                <SelectItem value="kiro">Kiro</SelectItem>
                <SelectItem value="codewhisperer">CodeWhisperer</SelectItem>
                <SelectItem value="amazonq">Amazon Q</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="enableFallback"
              checked={endpoint.enableFallback}
              onCheckedChange={(checked) => setEndpoint({ ...endpoint, enableFallback: checked })}
            />
            <Label htmlFor="enableFallback" className="cursor-pointer">启用回退</Label>
          </div>
          <p className="text-xs text-muted-foreground">当首选端点失败时自动尝试其他端点</p>
        </CardContent>
      </Card>

      {/* Prompt 过滤 */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt 过滤</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="filterClaudeCode"
                checked={promptFilter.filterClaudeCode}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterClaudeCode: checked })}
              />
              <Label htmlFor="filterClaudeCode" className="cursor-pointer">过滤 Claude Code</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">移除 Claude Code 特定的提示内容</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="filterEnvNoise"
                checked={promptFilter.filterEnvNoise}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterEnvNoise: checked })}
              />
              <Label htmlFor="filterEnvNoise" className="cursor-pointer">过滤环境噪音</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">移除环境变量和系统信息</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="filterStripBoundaries"
                checked={promptFilter.filterStripBoundaries}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterStripBoundaries: checked })}
              />
              <Label htmlFor="filterStripBoundaries" className="cursor-pointer">过滤边界标记</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">移除XML边界标记</p>
          </div>
        </CardContent>
      </Card>

      {/* 自定义过滤规则 */}
      <Card>
        <CardHeader>
          <CardTitle>自定义过滤规则</CardTitle>
          <CardDescription>添加自定义的正则表达式或文本匹配规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {promptFilter.rules.map((rule, idx) => (
            <Card key={idx} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>规则类型</Label>
                  <Select
                    value={rule.type}
                    onValueChange={(value) => updateRule(idx, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regex">正则表达式</SelectItem>
                      <SelectItem value="lines-containing">包含文本的行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>匹配模式</Label>
                  <Input
                    type="text"
                    placeholder={rule.type === 'regex' ? '正则表达式' : '要匹配的文本'}
                    value={rule.match}
                    onChange={(e) => updateRule(idx, 'match', e.target.value)}
                  />
                </div>
                {rule.type === 'regex' && (
                  <div>
                    <Label>替换为</Label>
                    <Input
                      type="text"
                      placeholder="替换内容（留空表示删除）"
                      value={rule.replace || ''}
                      onChange={(e) => updateRule(idx, 'replace', e.target.value)}
                    />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRule(idx)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除规则
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addRule}>
            <Plus className="w-4 h-4 mr-2" />
            添加规则
          </Button>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={loadSettings}>
          重置
        </Button>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  )
}
