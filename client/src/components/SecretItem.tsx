import { useMemo } from 'react'
import { toast } from 'sonner'
import { MoreVertical, Pencil, Trash2, Copy, QrCode } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { CountdownRing } from '@/components/CountdownRing'
import { useOTP } from '@/hooks/useOTP'
import type { Secret } from '@/services/api'

interface SecretItemProps {
  secret: Secret
  onEdit: (secret: Secret) => void
  onDelete: (secret: Secret) => void
  onShowQR: (secret: Secret) => void
}

export function SecretItem({ secret, onEdit, onDelete, onShowQR }: SecretItemProps) {
  const options = useMemo(() => ({
    digits: secret.digits,
    period: secret.period,
    algorithm: secret.algorithm,
    type: secret.type,
    counter: secret.counter,
  }), [secret.digits, secret.period, secret.algorithm, secret.type, secret.counter])

  const { code, progress } = useOTP(secret.secret, options)

  const initials = useMemo(() => {
    const name = secret.name || ''
    return name.slice(0, 2).toUpperCase()
  }, [secret.name])

  const faviconUrl = useMemo(() => {
    const name = (secret.name || '').toLowerCase()
    return `/api/favicon/${encodeURIComponent(name)}`
  }, [secret.name])

  const formattedCode = useMemo(() => {
    if (!code) return ''
    const mid = Math.ceil(code.length / 2)
    return `${code.slice(0, mid)} ${code.slice(mid)}`
  }, [code])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('已复制', { duration: 1500 })
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container transition-colors border-b border-outline/50 last:border-b-0">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={faviconUrl} alt={secret.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={handleCopy}
      >
        <div className="text-sm font-medium text-on-surface truncate">
          {secret.name}
        </div>
        {secret.account && (
          <div className="text-xs text-on-surface-variant truncate">
            {secret.account}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={handleCopy}>
        <span className="font-mono text-2xl font-light tracking-widest text-primary tabular-nums">
          {formattedCode}
        </span>
        <CountdownRing progress={progress} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors shrink-0">
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="w-4 h-4" />
            复制验证码
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShowQR(secret)}>
            <QrCode className="w-4 h-4" />
            显示二维码
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(secret)}>
            <Pencil className="w-4 h-4" />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(secret)} className="text-error focus:text-error">
            <Trash2 className="w-4 h-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
