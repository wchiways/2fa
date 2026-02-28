import { useState, type FormEvent, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Upload, FileText } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

interface ParsedSecret {
  name: string
  account?: string
  secret: string
  type?: 'TOTP' | 'HOTP'
  digits?: number
  period?: number
  algorithm?: string
}

function parseOTPAuthURL(url: string): ParsedSecret | null {
  try {
    const match = url.match(/^otpauth:\/\/(totp|hotp)\/(.+)\?(.+)$/)
    if (!match) return null

    const type = match[1].toUpperCase() as 'TOTP' | 'HOTP'
    const labelPart = decodeURIComponent(match[2])
    const params = new URLSearchParams(match[3])

    let name = ''
    let account = ''
    if (labelPart.includes(':')) {
      const parts = labelPart.split(':')
      name = parts[0].trim()
      account = parts.slice(1).join(':').trim()
    } else {
      name = labelPart.trim()
    }

    const issuer = params.get('issuer')
    if (issuer && !name) name = issuer

    const secret = params.get('secret')
    if (!secret) return null

    return {
      name: name || 'Unknown',
      account,
      secret,
      type,
      digits: parseInt(params.get('digits') || '6'),
      period: parseInt(params.get('period') || '30'),
      algorithm: params.get('algorithm') || 'SHA1',
    }
  } catch {
    return null
  }
}

function parseInput(text: string): ParsedSecret[] {
  const results: ParsedSecret[] = []
  const lines = text.trim().split('\n').filter(Boolean)

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('otpauth://')) {
      const parsed = parseOTPAuthURL(trimmed)
      if (parsed) results.push(parsed)
    }
  }

  // 尝试 JSON 解析
  if (results.length === 0) {
    try {
      const json = JSON.parse(text)
      const items = Array.isArray(json) ? json : json.secrets || json.services || json.db?.entries || []
      for (const item of items) {
        if (item.secret || item.info?.secret) {
          results.push({
            name: item.name || item.issuer || item.issuerExt || 'Unknown',
            account: item.account || item.label || item.userName || '',
            secret: item.secret || item.info?.secret || '',
            type: ((item.type || 'TOTP').toUpperCase() === 'HOTP' ? 'HOTP' : 'TOTP') as 'TOTP' | 'HOTP',
            digits: item.digits || item.info?.digits || 6,
            period: item.period || item.info?.period || 30,
            algorithm: item.algorithm || item.info?.algo || 'SHA1',
          })
        }
      }
    } catch {
      // not JSON
    }
  }

  return results
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedSecret[]>([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  function reset() {
    setText('')
    setParsed([])
    setFileName('')
  }

  function handleTextChange(value: string) {
    setText(value)
    if (value.trim()) {
      setParsed(parseInput(value))
    } else {
      setParsed([])
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setText(content)
      setParsed(parseInput(content))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (parsed.length === 0) return

    setLoading(true)
    try {
      const result = await api.batchAdd(parsed)
      toast.success(`已导入 ${result.added || parsed.length} 个密钥`)
      reset()
      onOpenChange(false)
      onImported()
    } catch {
      toast.error('导入失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量导入</DialogTitle>
          <DialogDescription>粘贴 OTPAuth URL 或导入文件</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4" />
                选择文件
                <input type="file" accept=".txt,.json,.csv,.2fas,.authpro" onChange={handleFile} className="hidden" />
              </label>
            </Button>
            {fileName && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {fileName}
              </span>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={"粘贴 OTPAuth URL（每行一个）或 JSON 内容\n\n示例：\notpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub"}
            className="w-full min-h-[140px] rounded-lg border border-outline bg-surface p-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {parsed.length > 0 && (
            <div className="rounded-lg border border-outline p-3 bg-surface-dim">
              <div className="text-sm font-medium text-on-surface mb-2">
                解析到 {parsed.length} 个密钥
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {parsed.map((s, i) => (
                  <div key={i} className="text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="text-success">●</span>
                    <span className="font-medium text-on-surface">{s.name}</span>
                    {s.account && <span>({s.account})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading || parsed.length === 0}>
              {loading ? '导入中...' : `导入 ${parsed.length} 个`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
