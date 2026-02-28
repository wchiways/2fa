import { useState } from 'react'
import { Search, X, Moon, Sun, Monitor, MoreVertical, LogOut, Upload, Download, Archive, Wrench } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'

interface TopBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  secretCount: number
  onImport: () => void
  onExport: () => void
  onBackup: () => void
  onTools: () => void
}

export function TopBar({ searchQuery, onSearchChange, secretCount, onImport, onExport, onBackup, onTools }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()

  function cycleTheme() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'dark' ? Sun : theme === 'light' ? Moon : Monitor

  const menuItems = [
    { icon: Upload, label: '批量导入', action: onImport },
    { icon: Download, label: '批量导出', action: onExport },
    { icon: Archive, label: '备份还原', action: onBackup },
    { icon: Wrench, label: '实用工具', action: onTools },
  ]

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline/50">
      <div className="max-w-2xl mx-auto flex items-center h-14 px-4 gap-2">
        {searchOpen ? (
          <>
            <Input
              type="text"
              placeholder="搜索密钥..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="flex-1 h-9 border-0 bg-surface-container focus-visible:ring-0"
            />
            <button
              onClick={() => { onSearchChange(''); setSearchOpen(false) }}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <h1 className="flex-1 text-lg font-semibold text-on-surface">
              两步验证
              {secretCount > 0 && (
                <span className="text-sm font-normal text-on-surface-variant ml-2">
                  {secretCount}
                </span>
              )}
            </h1>

            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={cycleTheme}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              title={`主题: ${theme}`}
            >
              <ThemeIcon className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-surface border border-outline rounded-lg shadow-lg py-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { item.action(); setMenuOpen(false) }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                    <div className="h-px bg-outline my-1" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false) }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
