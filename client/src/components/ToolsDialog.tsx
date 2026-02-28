import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  QrCode, Timer, KeyRound, ShieldCheck, Shuffle, Copy, Check, X,
  ChevronLeft, ScanLine, ImagePlus, Camera, RotateCcw,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  generateQRCodeDataURL, scanQRFromImageData, scanQRFromImageDataWithRetry,
} from '@/lib/qr'

type ToolPage = 'menu' | 'qrDecode' | 'qrGenerate' | 'base32' | 'timestamp' | 'keyCheck' | 'keyGen'

interface ToolsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ToolsDialog({ open, onOpenChange }: ToolsDialogProps) {
  const [page, setPage] = useState<ToolPage>('menu')

  function handleClose(v: boolean) {
    if (!v) setPage('menu')
    onOpenChange(v)
  }

  const tools = [
    { id: 'qrDecode' as const, icon: ScanLine, label: '二维码解析', desc: '扫描或上传图片解析' },
    { id: 'qrGenerate' as const, icon: QrCode, label: '二维码生成', desc: '将文本转为二维码' },
    { id: 'base32' as const, icon: KeyRound, label: 'Base32 编解码', desc: '编码和解码 Base32' },
    { id: 'timestamp' as const, icon: Timer, label: '时间戳工具', desc: 'TOTP 时间周期信息' },
    { id: 'keyCheck' as const, icon: ShieldCheck, label: '密钥检查器', desc: '验证 Base32 密钥格式' },
    { id: 'keyGen' as const, icon: Shuffle, label: '密钥生成器', desc: '生成随机 Base32 密钥' },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        {page === 'menu' ? (
          <>
            <DialogHeader>
              <DialogTitle>实用工具</DialogTitle>
              <DialogDescription>2FA 相关辅助工具</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPage(t.id)}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-outline/50 hover:bg-surface-container transition-colors text-center"
                >
                  <t.icon className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium text-on-surface">{t.label}</span>
                  <span className="text-[11px] text-on-surface-variant leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage('menu')} className="p-1 rounded-full hover:bg-surface-container transition-colors">
                  <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
                </button>
                <DialogTitle>{tools.find(t => t.id === page)?.label}</DialogTitle>
              </div>
              <DialogDescription className="sr-only">工具详情</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {page === 'qrDecode' && <QRDecodeTool />}
              {page === 'qrGenerate' && <QRGenerateTool />}
              {page === 'base32' && <Base32Tool />}
              {page === 'timestamp' && <TimestampTool />}
              {page === 'keyCheck' && <KeyCheckTool />}
              {page === 'keyGen' && <KeyGenTool />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ==================== QR 解析工具 ====================

function QRDecodeTool() {
  const [result, setResult] = useState('')
  const [qrDataURL, setQrDataURL] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return
    const video = videoRef.current
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const w = video.videoWidth, h = video.videoHeight
    if (!w || !h) { rafRef.current = requestAnimationFrame(scanLoop); return }
    canvas.width = w; canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const code = scanQRFromImageData(imageData)
    if (code) {
      stopCamera()
      setResult(code)
      try { setQrDataURL(generateQRCodeDataURL(code, 160)) } catch { /* ignore */ }
      return
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [stopCamera])

  async function startCamera() {
    setError('')
    setScanning(true)
    try {
      const configs = [
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user' } },
        { video: true as const },
      ]
      let stream: MediaStream | null = null
      for (const c of configs) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break } catch { /* next */ }
      }
      if (!stream) throw new Error('无法获取摄像头')
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error('超时')), 10000)
        video.onloadedmetadata = () => { clearTimeout(t); video.play().then(res).catch(rej) }
      })
      scanningRef.current = true
      setTimeout(() => { if (scanningRef.current) scanLoop() }, 500)
    } catch (err) {
      setScanning(false)
      setError((err as Error).message || '摄像头启动失败')
    }
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let w = img.width, h = img.height
        const max = 1000
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.floor(w * r); h = Math.floor(h * r) }
        canvas.width = w; canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        const code = scanQRFromImageDataWithRetry(ctx.getImageData(0, 0, w, h))
        if (code) {
          setResult(code)
          try { setQrDataURL(generateQRCodeDataURL(code, 160)) } catch { /* ignore */ }
        } else {
          toast.error('未在图片中找到二维码')
        }
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  async function copyResult() {
    try { await navigator.clipboard.writeText(result); toast.success('已复制') } catch { toast.error('复制失败') }
  }

  return (
    <div className="space-y-4">
      {!result ? (
        <>
          {scanning ? (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-white/60 rounded-2xl" />
              </div>
              <button onClick={stopCamera} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              {error && <p className="text-sm text-error text-center">{error}</p>}
              <div className="flex gap-3">
                <Button onClick={startCamera}><Camera className="w-4 h-4" />摄像头扫描</Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer"><ImagePlus className="w-4 h-4" />上传图片<input type="file" accept="image/*" onChange={handleImage} className="hidden" /></label>
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-outline p-3 bg-surface-dim">
            <div className="text-xs text-on-surface-variant mb-1">解析结果</div>
            <div className="text-sm text-on-surface break-all font-mono">{result}</div>
          </div>
          {qrDataURL && (
            <div className="flex justify-center">
              <img src={qrDataURL} alt="QR" className="w-40 h-40 rounded-lg bg-white p-1" />
            </div>
          )}
          <div className="flex gap-3">
            <Button className="flex-1" onClick={copyResult}><Copy className="w-4 h-4" />复制内容</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setResult(''); setQrDataURL('') }}>
              <RotateCcw className="w-4 h-4" />重新扫描
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== QR 生成工具 ====================

function QRGenerateTool() {
  const [text, setText] = useState('')
  const [qrDataURL, setQrDataURL] = useState('')

  function generate() {
    if (!text.trim()) { toast.error('请输入内容'); return }
    try {
      setQrDataURL(generateQRCodeDataURL(text.trim(), 250))
    } catch (e) {
      toast.error('生成失败: ' + (e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input placeholder="输入要生成二维码的文本" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} />
        <Button className="w-full" onClick={generate} disabled={!text.trim()}>生成二维码</Button>
      </div>
      {qrDataURL && (
        <div className="flex justify-center py-2">
          <img src={qrDataURL} alt="QR Code" className="w-[250px] h-[250px] rounded-lg bg-white p-2" />
        </div>
      )}
    </div>
  )
}

// ==================== Base32 编解码工具 ====================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(text: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  let bits = 0, bitsLen = 0, result = ''
  for (const b of bytes) {
    bits = (bits << 8) | b
    bitsLen += 8
    while (bitsLen >= 5) { bitsLen -= 5; result += BASE32_CHARS[(bits >>> bitsLen) & 31] }
  }
  if (bitsLen > 0) result += BASE32_CHARS[(bits << (5 - bitsLen)) & 31]
  while (result.length % 8 !== 0) result += '='
  return result
}

function base32Decode(input: string): string {
  const cleaned = input.replace(/=+$/, '').toUpperCase()
  if (!/^[A-Z2-7]+$/.test(cleaned)) throw new Error('包含无效的 Base32 字符')
  let bits = 0, bitsLen = 0
  const bytes: number[] = []
  for (const ch of cleaned) {
    bits = (bits << 5) | BASE32_CHARS.indexOf(ch)
    bitsLen += 5
    while (bitsLen >= 8) { bitsLen -= 8; bytes.push((bits >>> bitsLen) & 255) }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

function Base32Tool() {
  const [plainText, setPlainText] = useState('')
  const [encoded, setEncoded] = useState('')
  const [b32Input, setB32Input] = useState('')
  const [decoded, setDecoded] = useState('')

  function handleEncode() {
    if (!plainText.trim()) { toast.error('请输入文本'); return }
    try { setEncoded(base32Encode(plainText)) } catch (e) { toast.error('编码失败: ' + (e as Error).message) }
  }
  function handleDecode() {
    if (!b32Input.trim()) { toast.error('请输入 Base32 文本'); return }
    try { setDecoded(base32Decode(b32Input.trim())) } catch (e) { toast.error('解码失败: ' + (e as Error).message) }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success('已复制') } catch { toast.error('复制失败') }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">编码 (文本 → Base32)</label>
        <Input placeholder="输入要编码的文本" value={plainText} onChange={e => setPlainText(e.target.value)} />
        <Button size="sm" className="w-full" onClick={handleEncode}>编码</Button>
        {encoded && (
          <div className="rounded-lg border border-outline p-3 bg-surface-dim flex items-start gap-2">
            <code className="text-xs text-on-surface break-all flex-1">{encoded}</code>
            <button onClick={() => copy(encoded)} className="shrink-0 p-1 hover:bg-surface-container rounded"><Copy className="w-3.5 h-3.5 text-on-surface-variant" /></button>
          </div>
        )}
      </div>
      <div className="h-px bg-outline" />
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">解码 (Base32 → 文本)</label>
        <Input placeholder="输入 Base32 文本" value={b32Input} onChange={e => setB32Input(e.target.value)} className="font-mono" />
        <Button size="sm" className="w-full" onClick={handleDecode}>解码</Button>
        {decoded && (
          <div className="rounded-lg border border-outline p-3 bg-surface-dim flex items-start gap-2">
            <span className="text-sm text-on-surface break-all flex-1">{decoded}</span>
            <button onClick={() => copy(decoded)} className="shrink-0 p-1 hover:bg-surface-container rounded"><Copy className="w-3.5 h-3.5 text-on-surface-variant" /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 时间戳工具 ====================

function TimestampTool() {
  const [period, setPeriod] = useState(30)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const counter = Math.floor(now / period)
  const remaining = period - (now % period)
  const progress = (remaining / period) * 100

  const periods = [30, 60, 120] as const

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
              period === p
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {p}s
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <Row label="Unix 时间戳" value={now.toString()} mono />
        <Row label="TOTP 周期" value={`${period} 秒`} />
        <Row label="周期计数" value={counter.toString()} mono />
        <Row label="剩余时间" value={`${remaining} 秒`} />
      </div>

      <div className="h-2 rounded-full bg-surface-container overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className={`text-sm font-medium text-on-surface ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

// ==================== 密钥检查器 ====================

interface CheckResult {
  isValid: boolean
  length: number
  lengthValid: boolean
  charsetValid: boolean
  paddingValid: boolean
  suggestions: string[]
}

function validateSecret(secret: string): CheckResult {
  const result: CheckResult = {
    isValid: false, length: secret.length,
    lengthValid: secret.length >= 8,
    charsetValid: /^[A-Z2-7]+=*$/.test(secret),
    paddingValid: true, suggestions: [],
  }
  if (!result.lengthValid) result.suggestions.push('密钥长度至少需要 8 个字符')
  if (!result.charsetValid) result.suggestions.push('只能包含 A-Z 和 2-7 的字符')
  const withoutPad = secret.replace(/=+$/, '')
  const padLen = secret.length - withoutPad.length
  result.paddingValid = padLen <= 6
  if (!result.paddingValid) result.suggestions.push('填充字符 (=) 不能超过 6 个')
  if ((withoutPad.length + padLen) % 8 !== 0) result.suggestions.push('填充后总长度必须是 8 的倍数')
  result.isValid = result.lengthValid && result.charsetValid && result.paddingValid
  return result
}

function KeyCheckTool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)

  function check() {
    const s = input.trim().toUpperCase()
    if (!s) { toast.error('请输入密钥'); return }
    setResult(validateSecret(s))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input placeholder="输入 Base32 密钥" value={input} onChange={e => setInput(e.target.value)} className="font-mono" onKeyDown={e => e.key === 'Enter' && check()} />
        <Button className="w-full" onClick={check}>检查密钥</Button>
      </div>
      {result && (
        <div className="rounded-lg border border-outline p-4 space-y-3">
          <div className="flex items-center gap-2">
            {result.isValid ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
            <span className={`font-semibold ${result.isValid ? 'text-green-600' : 'text-red-500'}`}>
              {result.isValid ? '密钥有效' : '密钥无效'}
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <CheckRow label="长度" ok={result.lengthValid} detail={`${result.length} 字符`} />
            <CheckRow label="字符集" ok={result.charsetValid} detail={result.charsetValid ? '符合 Base32 规范' : '包含非法字符'} />
            <CheckRow label="填充" ok={result.paddingValid} detail={result.paddingValid ? '正确' : '错误'} />
          </div>
          {result.suggestions.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <div className="font-medium">改进建议:</div>
              {result.suggestions.map((s, i) => <div key={i}>• {s}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={ok ? 'text-green-600' : 'text-red-500'}>{detail}</span>
    </div>
  )
}

// ==================== 密钥生成器 ====================

function KeyGenTool() {
  const [length, setLength] = useState(16)
  const [key, setKey] = useState('')

  function generate() {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += BASE32_CHARS[Math.floor(Math.random() * 32)]
    }
    setKey(result)
  }

  async function copyKey() {
    if (!key) return
    try { await navigator.clipboard.writeText(key); toast.success('已复制') } catch { toast.error('复制失败') }
  }

  const lengths = [16, 26, 32] as const

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">密钥长度</label>
        <div className="flex gap-2">
          {lengths.map(l => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                length === l
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {l} 位
            </button>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={generate}>生成密钥</Button>
      {key && (
        <div className="rounded-lg border border-outline p-3 bg-surface-dim flex items-center gap-2">
          <code className="text-sm font-mono text-on-surface break-all flex-1 tracking-wider">{key}</code>
          <button onClick={copyKey} className="shrink-0 p-1.5 hover:bg-surface-container rounded">
            <Copy className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      )}
    </div>
  )
}
