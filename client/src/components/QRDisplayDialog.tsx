import { useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { generateQRCodeDataURL, buildOTPAuthURL } from '@/lib/qr'
import type { Secret } from '@/services/api'

interface QRDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: Secret | null
}

export function QRDisplayDialog({ open, onOpenChange, secret }: QRDisplayDialogProps) {
  const qrDataURL = useMemo(() => {
    if (!secret) return ''
    try {
      const url = buildOTPAuthURL(secret)
      return generateQRCodeDataURL(url, 220)
    } catch {
      return ''
    }
  }, [secret])

  if (!secret) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{secret.name}</DialogTitle>
          <DialogDescription>
            {secret.account || '扫描此二维码导入到其他 2FA 应用'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          {qrDataURL ? (
            <img
              src={qrDataURL}
              alt="2FA 二维码"
              className="w-[220px] h-[220px] rounded-lg bg-white p-2"
            />
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center rounded-lg bg-surface-container text-sm text-on-surface-variant">
              生成失败
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
