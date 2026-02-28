import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { RotateCcw, Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api, type Backup } from '@/services/api'

interface BackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: () => void
}

export function BackupDialog({ open, onOpenChange, onRestored }: BackupDialogProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) fetchBackups()
  }, [open])

  async function fetchBackups() {
    setLoading(true)
    try {
      const data = await api.getBackups()
      setBackups(data.backups || [])
    } catch {
      toast.error('加载备份列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setCreating(true)
    try {
      await api.createBackup()
      toast.success('备份已创建')
      await fetchBackups()
    } catch {
      toast.error('创建备份失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleRestore(backupKey: string) {
    setRestoring(backupKey)
    try {
      await api.restoreBackup(backupKey)
      toast.success('已还原')
      onOpenChange(false)
      onRestored()
    } catch {
      toast.error('还原失败')
    } finally {
      setRestoring(null)
    }
  }

  function formatDate(ts: string) {
    try {
      return new Date(ts).toLocaleString('zh-CN')
    } catch {
      return ts
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>备份与还原</DialogTitle>
          <DialogDescription>管理您的密钥备份</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Button onClick={handleCreate} disabled={creating} variant="outline" className="w-full">
            <Plus className="w-4 h-4" />
            {creating ? '创建中...' : '创建新备份'}
          </Button>

          {loading ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">加载中...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">暂无备份</div>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-outline"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-on-surface">{formatDate(b.timestamp)}</div>
                    <div className="text-xs text-on-surface-variant">{b.count} 个密钥</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(b.key)}
                    disabled={restoring === b.key}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {restoring === b.key ? '还原中...' : '还原'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
