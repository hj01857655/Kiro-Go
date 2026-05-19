import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
} from './ui/dialog'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import {
  Search,
  Plus,
  RefreshCw,
  Settings,
  Key,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Keyboard,
  FileJson,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Eye,
} from 'lucide-react'
import { cn } from '../lib/utils'

export function CommandPalette({
  open,
  onOpenChange,
  onCommand,
  activeTab,
  selectedAccounts = []
}) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands = useMemo(() => {
    const baseCommands = [
      // Navigation
      {
        id: 'nav-accounts',
        label: '切换到账户管理',
        icon: ToggleLeft,
        category: '导航',
        keywords: ['账户', 'account', 'nav'],
        action: () => onCommand?.('tab:accounts'),
        show: activeTab !== 'accounts'
      },
      {
        id: 'nav-apikeys',
        label: '切换到API密钥',
        icon: Key,
        category: '导航',
        keywords: ['api', 'key', 'nav'],
        action: () => onCommand?.('tab:apikeys'),
        show: activeTab !== 'apikeys'
      },
      {
        id: 'nav-settings',
        label: '切换到系统设置',
        icon: Settings,
        category: '导航',
        keywords: ['设置', 'settings', 'nav'],
        action: () => onCommand?.('tab:settings'),
        show: activeTab !== 'settings'
      },

      // Actions
      {
        id: 'action-add',
        label: '添加新账户',
        icon: Plus,
        category: '操作',
        keywords: ['添加', 'add', 'new', 'create'],
        action: () => onCommand?.('add'),
        show: activeTab === 'accounts'
      },
      {
        id: 'action-refresh',
        label: '刷新列表',
        icon: RefreshCw,
        category: '操作',
        keywords: ['刷新', 'refresh', 'reload'],
        action: () => onCommand?.('refresh'),
        show: true
      },
      {
        id: 'action-search',
        label: '聚焦搜索框',
        icon: Search,
        category: '操作',
        keywords: ['搜索', 'search', 'find'],
        action: () => onCommand?.('search'),
        show: activeTab === 'accounts'
      },
      {
        id: 'action-shortcuts',
        label: '显示快捷键',
        icon: Keyboard,
        category: '操作',
        keywords: ['快捷键', 'shortcuts', 'keyboard'],
        action: () => onCommand?.('shortcuts'),
        show: true
      },

      // Batch operations (only show when accounts are selected)
      {
        id: 'batch-enable',
        label: `批量启用 (${selectedAccounts.length} 个账户)`,
        icon: ToggleRight,
        category: '批量操作',
        keywords: ['批量', 'batch', 'enable', '启用'],
        action: () => onCommand?.('batch:enable'),
        show: activeTab === 'accounts' && selectedAccounts.length > 0
      },
      {
        id: 'batch-disable',
        label: `批量禁用 (${selectedAccounts.length} 个账户)`,
        icon: ToggleLeft,
        category: '批量操作',
        keywords: ['批量', 'batch', 'disable', '禁用'],
        action: () => onCommand?.('batch:disable'),
        show: activeTab === 'accounts' && selectedAccounts.length > 0
      },
      {
        id: 'batch-delete',
        label: `批量删除 (${selectedAccounts.length} 个账户)`,
        icon: Trash2,
        category: '批量操作',
        keywords: ['批量', 'batch', 'delete', '删除'],
        action: () => onCommand?.('batch:delete'),
        show: activeTab === 'accounts' && selectedAccounts.length > 0
      },

      // Export
      {
        id: 'export-json',
        label: '导出为 JSON',
        icon: FileJson,
        category: '导出',
        keywords: ['导出', 'export', 'json'],
        action: () => onCommand?.('export:json'),
        show: activeTab === 'accounts'
      },
      {
        id: 'export-csv',
        label: '导出为 CSV',
        icon: FileSpreadsheet,
        category: '导出',
        keywords: ['导出', 'export', 'csv'],
        action: () => onCommand?.('export:csv'),
        show: activeTab === 'accounts'
      },

      // Theme
      {
        id: 'theme-light',
        label: '切换到浅色主题',
        icon: Sun,
        category: '主题',
        keywords: ['主题', 'theme', 'light', '浅色'],
        action: () => onCommand?.('theme:light'),
        show: true
      },
      {
        id: 'theme-dark',
        label: '切换到深色主题',
        icon: Moon,
        category: '主题',
        keywords: ['主题', 'theme', 'dark', '深色'],
        action: () => onCommand?.('theme:dark'),
        show: true
      },
      {
        id: 'theme-system',
        label: '跟随系统主题',
        icon: Monitor,
        category: '主题',
        keywords: ['主题', 'theme', 'system', '系统'],
        action: () => onCommand?.('theme:system'),
        show: true
      },

      // System
      {
        id: 'system-logout',
        label: '退出登录',
        icon: LogOut,
        category: '系统',
        keywords: ['退出', 'logout', 'exit'],
        action: () => onCommand?.('logout'),
        show: true
      },
    ]

    return baseCommands.filter(cmd => cmd.show)
  }, [activeTab, selectedAccounts.length, onCommand])

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(searchLower)) ||
      cmd.category.toLowerCase().includes(searchLower)
    )
  }, [commands, search])

  const groupedCommands = useMemo(() => {
    const groups = {}
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filteredCommands[selectedIndex]
        if (cmd) {
          cmd.action()
          onOpenChange(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, filteredCommands, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索命令..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-[400px]">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              未找到匹配的命令
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category} className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {cmds.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd)
                    const Icon = cmd.icon
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onOpenChange(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          "hover:bg-accent",
                          globalIndex === selectedIndex && "bg-accent"
                        )}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 text-left">{cmd.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ 导航</span>
            <span>↵ 选择</span>
            <span>Esc 关闭</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
