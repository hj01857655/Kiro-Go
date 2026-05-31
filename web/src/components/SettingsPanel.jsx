import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotification } from './ui/notification'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'
import { Trash2, Plus, RotateCcw } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

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
    rules: [],
    injections: []
  })

  // Dry-run preview state — tied to /admin/api/prompt-filter/preview.
  // The textarea holds the operator's sample system prompt; result holds the
  // post-filter+inject string returned by the backend.
  const [previewInput, setPreviewInput] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  // 统计重置：破坏性即时动作（不走 saveSettings），二次确认后调用 /stats/reset
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleResetStats = async () => {
    setResetting(true)
    try {
      const res = await fetch('/admin/api/stats/reset', {
        method: 'POST',
        headers: { 'X-Admin-Password': password }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      notify.success(t('settings.resetStatsSuccess'))
    } catch (e) {
      notify.error(t('settings.resetStatsError') + ': ' + e.message)
    } finally {
      setResetting(false)
      setResetConfirmOpen(false)
    }
  }

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
        setPromptFilter({
          filterClaudeCode: !!data.filterClaudeCode,
          filterEnvNoise: !!data.filterEnvNoise,
          filterStripBoundaries: !!data.filterStripBoundaries,
          rules: Array.isArray(data.rules) ? data.rules : [],
          injections: Array.isArray(data.injections) ? data.injections : []
        })
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

  // ----- Prompt injection list management (additive blocks applied at the
  // tail of the filter chain). Mirrors rule helpers above for consistency. -----
  const addInjection = () => {
    setPromptFilter({
      ...promptFilter,
      injections: [
        ...(promptFilter.injections || []),
        {
          id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: '',
          position: 'append',
          content: '',
          enabled: true
        }
      ]
    })
  }

  const removeInjection = (idx) => {
    setPromptFilter({
      ...promptFilter,
      injections: (promptFilter.injections || []).filter((_, i) => i !== idx)
    })
  }

  const updateInjection = (idx, field, value) => {
    const list = [...(promptFilter.injections || [])]
    list[idx] = { ...list[idx], [field]: value }
    setPromptFilter({ ...promptFilter, injections: list })
  }

  // Send the current (possibly unsaved) filter+injection state plus the sample
  // prompt to the dry-run endpoint. Lets operators verify behaviour before
  // committing changes via Save.
  const runPreview = async () => {
    setPreviewing(true)
    try {
      const res = await fetch('/admin/api/prompt-filter/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({
          prompt: previewInput,
          filterClaudeCode: promptFilter.filterClaudeCode,
          filterEnvNoise: promptFilter.filterEnvNoise,
          filterStripBoundaries: promptFilter.filterStripBoundaries,
          rules: promptFilter.rules || [],
          injections: promptFilter.injections || []
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPreviewResult(data)
    } catch (e) {
      notify.error(t('settings.previewError') + ': ' + e.message)
    } finally {
      setPreviewing(false)
    }
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

      {/* Prompt 注入（在过滤链尾部追加文本，例如 persona / 标准指令） */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.injectionsIcon')}</span>
            </div>
            {t('settings.injections')}
          </CardTitle>
          <CardDescription>{t('settings.injectionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(promptFilter.injections || []).map((inj, idx) => (
            <Card key={inj.id || idx} className="border-2 border-border/50 glass">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`inj-enabled-${idx}`}
                      checked={inj.enabled !== false}
                      onCheckedChange={(checked) => updateInjection(idx, 'enabled', checked)}
                    />
                    <Label htmlFor={`inj-enabled-${idx}`} className="cursor-pointer">
                      {inj.enabled !== false ? t('settings.injectionEnabled') : t('settings.injectionDisabled')}
                    </Label>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeInjection(idx)}
                    className="shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('settings.deleteInjection')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('settings.injectionName')}</Label>
                    <Input
                      type="text"
                      placeholder={t('settings.injectionNamePlaceholder')}
                      value={inj.name || ''}
                      onChange={(e) => updateInjection(idx, 'name', e.target.value)}
                      className="border-2 focus:border-amber-500 dark:focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <Label>{t('settings.injectionPosition')}</Label>
                    <Select
                      value={inj.position || 'append'}
                      onValueChange={(value) => updateInjection(idx, 'position', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefix">{t('settings.injectionPrefix')}</SelectItem>
                        <SelectItem value="append">{t('settings.injectionAppend')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t('settings.injectionContent')}</Label>
                  <Textarea
                    rows={4}
                    placeholder={t('settings.injectionContentPlaceholder')}
                    value={inj.content || ''}
                    onChange={(e) => updateInjection(idx, 'content', e.target.value)}
                    className="border-2 focus:border-amber-500 dark:focus:border-amber-400 font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.injectionContentHelp')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={addInjection}
            className="border-2 border-border hover:border-amber-500 dark:hover:border-amber-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('settings.addInjection')}
          </Button>
        </CardContent>
      </Card>

      {/* 预览（dry-run，不持久化）*/}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">{t('settings.previewIcon')}</span>
            </div>
            {t('settings.preview')}
          </CardTitle>
          <CardDescription>{t('settings.previewDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('settings.previewInput')}</Label>
            <Textarea
              rows={6}
              placeholder={t('settings.previewInputPlaceholder')}
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              className="border-2 focus:border-cyan-500 dark:focus:border-cyan-400 font-mono text-xs"
            />
          </div>
          <Button
            variant="outline"
            onClick={runPreview}
            disabled={previewing}
            className="border-2 border-border hover:border-cyan-500 dark:hover:border-cyan-400"
          >
            {previewing ? t('settings.previewing') : t('settings.runPreview')}
          </Button>
          {previewResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('settings.previewOriginal')}</Label>
                  <pre className="rounded-md border-2 border-border/50 bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-96 overflow-auto">
                    {previewResult.original || ''}
                  </pre>
                </div>
                <div>
                  <Label className="text-cyan-600 dark:text-cyan-400">{t('settings.previewFiltered')}</Label>
                  <pre className="rounded-md border-2 border-cyan-500/40 bg-cyan-500/5 p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-96 overflow-auto">
                    {previewResult.filtered || ''}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计重置（破坏性即时动作，不随保存按钮触发） */}
      <Card className="border-0 shadow-md glass card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-md">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            {t('settings.resetStats')}
          </CardTitle>
          <CardDescription>{t('settings.resetStatsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetting}
            className="shadow-sm hover:shadow-md"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? t('settings.resettingStats') : t('settings.resetStats')}
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

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={t('settings.resetStatsConfirmTitle')}
        description={t('settings.resetStatsConfirmDesc')}
        variant="destructive"
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={handleResetStats}
      />
    </div>
  )
}
