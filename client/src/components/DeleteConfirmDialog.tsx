import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Secret } from '@/services/api'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: Secret | null
  onConfirm: (id: string) => Promise<void>
}

export function DeleteConfirmDialog({ open, onOpenChange, secret, onConfirm }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!secret) return
    setLoading(true)
    try {
      await onConfirm(secret.id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>删除密钥</DialogTitle>
          <DialogDescription>
            确定要删除 <span className="font-medium text-on-surface">{secret?.name}</span> 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? '删除中...' : '删除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
