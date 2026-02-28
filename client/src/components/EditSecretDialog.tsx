import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Secret } from '@/services/api'

interface EditSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: Secret | null
  onSave: (id: string, data: Partial<Secret>) => Promise<void>
}

export function EditSecretDialog({ open, onOpenChange, secret, onSave }: EditSecretDialogProps) {
  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (secret) {
      setName(secret.name || '')
      setAccount(secret.account || '')
      setSecretValue(secret.secret || '')
    }
  }, [secret])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!secret || !name.trim() || !secretValue.trim()) return

    setLoading(true)
    try {
      await onSave(secret.id, {
        name: name.trim(),
        account: account.trim(),
        secret: secretValue.trim().replace(/\s/g, ''),
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑密钥</DialogTitle>
          <DialogDescription>修改 {secret?.name} 的信息</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">服务名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">账户名称</label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">密钥</label>
            <Input value={secretValue} onChange={(e) => setSecretValue(e.target.value)} className="font-mono" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading || !name.trim() || !secretValue.trim()}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
