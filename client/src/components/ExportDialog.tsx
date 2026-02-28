import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Secret } from '@/services/api'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secrets: Secret[]
}

type ExportFormat = 'txt' | 'json' | 'csv'

function generateOTPAuthURL(s: Secret): string {
  const type = (s.type || 'totp').toLowerCase()
  const label = s.account
    ? `${encodeURIComponent(s.name)}:${encodeURIComponent(s.account)}`
    : encodeURIComponent(s.name)
  const params = new URLSearchParams({
    secret: s.secret.toUpperCase(),
    issuer: s.name,
    algorithm: s.algorithm || 'SHA1',
    digits: (s.digits || 6).toString(),
    period: (s.period || 30).toString(),
  })
  return `otpauth://${type}/${label}?${params}`
}

function exportAsTxt(secrets: Secret[]): string {
  return secrets.map(generateOTPAuthURL).join('\n')
}

function exportAsJson(secrets: Secret[]): string {
  return JSON.stringify(secrets.map(s => ({
    name: s.name,
    account: s.account || '',
    secret: s.secret,
    type: s.type || 'TOTP',
    digits: s.digits || 6,
    period: s.period || 30,
    algorithm: s.algorithm || 'SHA1',
  })), null, 2)
}

function exportAsCsv(secrets: Secret[]): string {
  const header = 'name,account,secret,type,digits,period,algorithm'
  const rows = secrets.map(s =>
    [s.name, s.account || '', s.secret, s.type || 'TOTP', s.digits || 6, s.period || 30, s.algorithm || 'SHA1'].join(',')
  )
  return [header, ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const formats: { id: ExportFormat; label: string; ext: string; desc: string }[] = [
  { id: 'txt', label: 'OTPAuth URL', ext: '.txt', desc: '通用格式，兼容所有验证器' },
  { id: 'json', label: 'JSON', ext: '.json', desc: '结构化数据格式' },
  { id: 'csv', label: 'CSV', ext: '.csv', desc: '表格格式，可用 Excel 打开' },
]

export function ExportDialog({ open, onOpenChange, secrets }: ExportDialogProps) {
  const [_exporting, setExporting] = useState(false)

  function handleExport(format: ExportFormat) {
    setExporting(true)
    try {
      const date = new Date().toISOString().split('T')[0]
      const prefix = `2FA-secrets-${date}`

      switch (format) {
        case 'txt':
          downloadFile(exportAsTxt(secrets), `${prefix}.txt`, 'text/plain')
          break
        case 'json':
          downloadFile(exportAsJson(secrets), `${prefix}.json`, 'application/json')
          break
        case 'csv':
          downloadFile('\uFEFF' + exportAsCsv(secrets), `${prefix}.csv`, 'text/csv;charset=utf-8')
          break
      }
      toast.success(`已导出 ${secrets.length} 个密钥`)
      onOpenChange(false)
    } catch {
      toast.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>导出密钥</DialogTitle>
          <DialogDescription>共 {secrets.length} 个密钥，选择导出格式</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              className="flex items-center gap-3 w-full p-3 rounded-lg border border-outline hover:bg-surface-container transition-colors text-left"
            >
              <Download className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-on-surface">{f.label}</div>
                <div className="text-xs text-on-surface-variant">{f.desc}</div>
              </div>
              <span className="text-xs text-on-surface-variant">{f.ext}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
