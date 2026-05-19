import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Command, Search, Plus, RefreshCw, Settings, Keyboard } from 'lucide-react'

export function KeyboardShortcutsDialog({ open, onOpenChange }) {
  const shortcuts = [
    {
      category: '通用',
      items: [
        { keys: ['Ctrl', 'K'], description: '打开命令面板' },
        { keys: ['Ctrl', '/'], description: '显示快捷键' },
        { keys: ['Esc'], description: '关闭对话框' },
      ]
    },
    {
      category: '导航',
      items: [
        { keys: ['Ctrl', '1'], description: '切换到账户管理' },
        { keys: ['Ctrl', '2'], description: '切换到API密钥' },
        { keys: ['Ctrl', '3'], description: '切换到系统设置' },
      ]
    },
    {
      category: '操作',
      items: [
        { keys: ['Ctrl', 'N'], description: '添加新账户' },
        { keys: ['Ctrl', 'R'], description: '刷新列表' },
        { keys: ['Ctrl', 'F'], description: '聚焦搜索框' },
      ]
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            使用键盘快捷键提升操作效率
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <Badge key={keyIdx} variant="outline" className="font-mono">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {section !== shortcuts[shortcuts.length - 1] && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useKeyboardShortcuts({ onSearch, onAdd, onRefresh, onTabChange, onCommand }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const down = (e) => {
      // Ctrl+K: Command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen(true)
      }

      // Ctrl+/: Show shortcuts
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShortcutsOpen(true)
      }

      // Ctrl+N: Add new
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onAdd?.()
      }

      // Ctrl+R: Refresh
      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onRefresh?.()
      }

      // Ctrl+F: Focus search
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onSearch?.()
      }

      // Ctrl+1/2/3: Switch tabs
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const tabs = ['accounts', 'apikeys', 'settings']
        onTabChange?.(tabs[parseInt(e.key) - 1])
      }

      // Esc: Close dialogs
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setShortcutsOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onSearch, onAdd, onRefresh, onTabChange, onCommand])

  return {
    commandOpen,
    setCommandOpen,
    shortcutsOpen,
    setShortcutsOpen,
  }
}
