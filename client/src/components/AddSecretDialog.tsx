import { useState, type FormEvent } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AddSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (data: { name: string; account: string; secret: string }) => Promise<void>
}

export function AddSecretDialog({ open, onOpenChange, onAdd }: AddSecretDialogProps) {
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setName('')
    setAccount('')
    setSecret('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !secret.trim()) return

    setLoading(true)
    try {
      await onAdd({ name: name.trim(), account: account.trim(), secret: secret.trim().replace(/\s/g, '') })
      reset()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加密钥</DialogTitle>
          <DialogDescription>手动输入 2FA 密钥信息</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">服务名称</label>
            <Input
              placeholder="如 GitHub、Google"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">账户名称</label>
            <Input
              placeholder="如 user@example.com（可选）"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">密钥</label>
            <Input
              placeholder="Base32 编码的密钥"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !secret.trim()}>
              {loading ? '添加中...' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
