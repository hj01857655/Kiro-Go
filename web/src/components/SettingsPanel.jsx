import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Trash2, Plus } from 'lucide-react'

export default function SettingsPanel({ password }) {
  const { t } = useTranslation()
  const notify = useNotification()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    port: 8080,
    host: '127.0.0.1',
    password: '',
    proxyURL: ''
  })

  const [thinking, setThinking] = useState({
    suffix: '-thinking',
    openaiFormat: 'none',
    claudeFormat: 'none'
  })

  const [endpoint, setEndpoint] = useState({
    preferred: 'auto',
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
        setSettings(prev => ({
          ...prev,
          port: data.port || 8080,
          host: data.host || '127.0.0.1',
          password: data.password || '',
        }))
      }

      // 全局代理走独立路由 /admin/api/proxy
      const proxyRes = await fetch('/admin/api/proxy', {
        headers: { 'X-Admin-Password': password }
      })
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        setSettings(prev => ({ ...prev, proxyURL: data.proxyURL || '' }))
      }

      // 加载 thinking 配置
      const thinkingRes = await fetch('/admin/api/thinking', {
        headers: { 'X-Admin-Password': password }
      })
      if (thinkingRes.ok) {
        const data = await thinkingRes.json()
        setThinking({
          suffix: data.suffix || '-thinking',
          openaiFormat: data.openaiFormat || 'none',
          claudeFormat: data.claudeFormat || 'none'
        })
      }

      // 加载 endpoint 配置
      const endpointRes = await fetch('/admin/api/endpoint', {
        headers: { 'X-Admin-Password': password }
      })
      if (endpointRes.ok) {
        const data = await endpointRes.json()
        setEndpoint({
          preferred: data.preferredEndpoint || 'auto',
          enableFallback: data.endpointFallback !== false
        })
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
      notify.error(t('settings.loadError'))
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // 保存基础设置（不含 proxyURL，proxyURL 走独立 /proxy 路由）
      const { proxyURL, ...settingsBody } = settings
      await fetch('/admin/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify(settingsBody)
      })

      // 保存全局代理（独立路由，后端会做 URL 格式校验）
      const proxyRes = await fetch('/admin/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ proxyURL: proxyURL || '' })
      })
      if (!proxyRes.ok) {
        const err = await proxyRes.json().catch(() => ({}))
        throw new Error(err.error || 'proxy save failed')
      }

      // 保存 thinking 配置
      await fetch('/admin/api/thinking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          suffix: thinking.suffix,
          openaiFormat: thinking.openaiFormat === 'none' ? '' : thinking.openaiFormat,
          claudeFormat: thinking.claudeFormat === 'none' ? '' : thinking.claudeFormat
        })
      })

      // 保存 endpoint 配置
      await fetch('/admin/api/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          preferredEndpoint: endpoint.preferred === 'auto' ? '' : endpoint.preferred,
          endpointFallback: endpoint.enableFallback
        })
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

      notify.success(t('settings.saveSuccess'))
    } catch (e) {
      notify.error(t('settings.saveError') + ': ' + e.message)
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
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.basicIcon')}</span>
            </div>
            {t('settings.basic')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="port">{t('settings.serverPort')}</Label>
            <Input
              id="port"
              type="number"
              placeholder="8080"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('settings.restartRequired')}</p>
          </div>
          <div>
            <Label htmlFor="password">{t('settings.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={settings.password === '********' ? t('settings.passwordPlaceholder') : t('settings.passwordPlaceholderNew')}
              value={settings.password === '********' ? '' : settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
              onFocus={(e) => {
                // 点击时如果是掩码，清空让用户输入新密码
                if (settings.password === '********') {
                  setSettings({ ...settings, password: '' })
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {settings.password === '********' ? t('settings.passwordCurrentSet') : t('settings.passwordNoChange')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Proxy 设置 */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.proxyIcon')}</span>
            </div>
            {t('settings.proxy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="proxyURL">{t('settings.globalProxyUrl')}</Label>
            <Input
              id="proxyURL"
              type="text"
              placeholder="http://127.0.0.1:7890"
              value={settings.proxyURL}
              onChange={(e) => setSettings({ ...settings, proxyURL: e.target.value })}
              className="border-2 focus:border-green-500 dark:focus:border-green-400"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('settings.globalProxyHelp')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Thinking 配置 */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.thinkingIcon')}</span>
            </div>
            {t('settings.thinking')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="thinkingSuffix">{t('settings.thinkingSuffix')}</Label>
            <Input
              id="thinkingSuffix"
              type="text"
              placeholder="-thinking"
              value={thinking.suffix}
              onChange={(e) => setThinking({ ...thinking, suffix: e.target.value })}
              className="border-2 focus:border-purple-500 dark:focus:border-purple-400"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('settings.thinkingSuffixHelp')}</p>
          </div>
          <div>
            <Label htmlFor="openaiFormat">{t('settings.openaiFormat')}</Label>
            <Select
              value={thinking.openaiFormat}
              onValueChange={(value) => setThinking({ ...thinking, openaiFormat: value })}
            >
              <SelectTrigger id="openaiFormat">
                <SelectValue placeholder={t('settings.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.none')}</SelectItem>
                <SelectItem value="reasoning_content">reasoning_content</SelectItem>
                <SelectItem value="thinking">thinking</SelectItem>
                <SelectItem value="think">think</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="claudeFormat">{t('settings.claudeFormat')}</Label>
            <Select
              value={thinking.claudeFormat}
              onValueChange={(value) => setThinking({ ...thinking, claudeFormat: value })}
            >
              <SelectTrigger id="claudeFormat">
                <SelectValue placeholder={t('settings.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.none')}</SelectItem>
                <SelectItem value="reasoning_content">reasoning_content</SelectItem>
                <SelectItem value="thinking">thinking</SelectItem>
                <SelectItem value="think">think</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint 配置 */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.endpointIcon')}</span>
            </div>
            {t('settings.endpoint')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="preferredEndpoint">{t('settings.preferredEndpoint')}</Label>
            <Select
              value={endpoint.preferred}
              onValueChange={(value) => setEndpoint({ ...endpoint, preferred: value })}
            >
              <SelectTrigger id="preferredEndpoint">
                <SelectValue placeholder={t('settings.auto')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('settings.auto')}</SelectItem>
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
            <Label htmlFor="enableFallback" className="cursor-pointer">{t('settings.enableFallback')}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.fallbackHelp')}</p>
        </CardContent>
      </Card>

      {/* Prompt 过滤 */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.filterIcon')}</span>
            </div>
            {t('settings.promptFilter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="filterClaudeCode"
                checked={promptFilter.filterClaudeCode}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterClaudeCode: checked })}
              />
              <Label htmlFor="filterClaudeCode" className="cursor-pointer">{t('settings.filterClaudeCode')}</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">{t('settings.filterClaudeCodeHelp')}</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="filterEnvNoise"
                checked={promptFilter.filterEnvNoise}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterEnvNoise: checked })}
              />
              <Label htmlFor="filterEnvNoise" className="cursor-pointer">{t('settings.filterEnvNoise')}</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">{t('settings.filterEnvNoiseHelp')}</p>

            <div className="flex items-center space-x-2">
              <Switch
                id="filterStripBoundaries"
                checked={promptFilter.filterStripBoundaries}
                onCheckedChange={(checked) => setPromptFilter({ ...promptFilter, filterStripBoundaries: checked })}
              />
              <Label htmlFor="filterStripBoundaries" className="cursor-pointer">{t('settings.filterBoundaries')}</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">{t('settings.filterBoundariesHelp')}</p>
          </div>
        </CardContent>
      </Card>

      {/* 自定义过滤规则 */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.rulesIcon')}</span>
            </div>
            {t('settings.customRules')}
          </CardTitle>
          <CardDescription>{t('settings.customRulesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {promptFilter.rules.map((rule, idx) => (
            <Card key={idx} className="border-2 border-border/50 glass">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>{t('settings.ruleType')}</Label>
                  <Select
                    value={rule.type}
                    onValueChange={(value) => updateRule(idx, 'type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regex">{t('settings.regex')}</SelectItem>
                      <SelectItem value="lines-containing">{t('settings.linesContaining')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('settings.matchPattern')}</Label>
                  <Input
                    type="text"
                    placeholder={rule.type === 'regex' ? t('settings.regexPattern') : t('settings.textToMatch')}
                    value={rule.match}
                    onChange={(e) => updateRule(idx, 'match', e.target.value)}
                    className="border-2 focus:border-pink-500 dark:focus:border-pink-400"
                  />
                </div>
                {rule.type === 'regex' && (
                  <div>
                    <Label>{t('settings.replaceWith')}</Label>
                    <Input
                      type="text"
                      placeholder={t('settings.replacementContent')}
                      value={rule.replace || ''}
                      onChange={(e) => updateRule(idx, 'replace', e.target.value)}
                      className="border-2 focus:border-pink-500 dark:focus:border-pink-400"
                    />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRule(idx)}
                  className="shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('settings.deleteRule')}
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={addRule}
            className="border-2 border-border hover:border-pink-500 dark:hover:border-pink-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('settings.addRule')}
          </Button>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={loadSettings}
          className="border-2 border-border"
        >
          {t('settings.reset')}
        </Button>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all"
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </div>
  )
}
