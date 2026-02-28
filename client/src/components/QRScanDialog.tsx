import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Camera, ImagePlus, X, RotateCcw } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import {
  scanQRFromImageData, scanQRFromImageDataWithRetry,
  parseOTPAuthURL, parseGoogleMigration, type ParsedOTP,
} from '@/lib/qr'

interface QRScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: () => void
}

type ScanState = 'idle' | 'scanning' | 'error'

export function QRScanDialog({ open, onOpenChange, onScanned }: QRScanDialogProps) {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [continuous, setContinuous] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [migrationPreview, setMigrationPreview] = useState<ParsedOTP[] | null>(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scanningRef = useRef(false)
  const rafRef = useRef<number>(0)

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    stopCamera()
    setScanState('idle')
    setErrorMsg('')
    setContinuous(false)
    setScanCount(0)
    setMigrationPreview(null)
  }, [stopCamera])

  // 关闭时清理
  useEffect(() => {
    if (!open) cleanup()
  }, [open, cleanup])

  // 处理扫描到的 QR 码
  const processQRCode = useCallback(async (data: string) => {
    // Google Migration 格式
    if (data.startsWith('otpauth-migration://')) {
      try {
        const secrets = parseGoogleMigration(data)
        if (secrets.length === 0) {
          toast.error('未能从迁移二维码中解析出密钥')
          return
        }
        stopCamera()
        setMigrationPreview(secrets)
      } catch {
        toast.error('解析 Google 迁移二维码失败')
      }
      return
    }

    // 标准 OTPAuth URL
    const parsed = parseOTPAuthURL(data)
    if (!parsed) {
      toast.error('不是有效的 2FA 二维码')
      if (continuous && scanningRef.current) {
        setTimeout(() => { if (scanningRef.current) scanLoop() }, 1000)
      }
      return
    }

    try {
      await api.addSecret({
        name: parsed.name,
        account: parsed.account,
        secret: parsed.secret.toUpperCase(),
        type: parsed.type,
        digits: parsed.digits,
        period: parsed.period,
        algorithm: parsed.algorithm,
        counter: parsed.counter,
      })
      toast.success(`已添加: ${parsed.name}`)
      onScanned()

      if (continuous) {
        setScanCount(c => c + 1)
        setTimeout(() => { if (scanningRef.current) scanLoop() }, 800)
      } else {
        onOpenChange(false)
      }
    } catch {
      toast.error('保存失败')
      if (continuous && scanningRef.current) {
        setTimeout(() => { if (scanningRef.current) scanLoop() }, 1000)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuous, onOpenChange, onScanned, stopCamera])

  // 扫描循环
  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return
    const video = videoRef.current
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const w = video.videoWidth
    const h = video.videoHeight
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const result = scanQRFromImageData(imageData)

    if (result) {
      processQRCode(result)
      return
    }

    rafRef.current = requestAnimationFrame(scanLoop)
  }, [processQRCode])

  // 启动摄像头
  const startCamera = useCallback(async () => {
    setScanState('scanning')
    setErrorMsg('')

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }

      const configs = [
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
        { video: true as const },
      ]

      let stream: MediaStream | null = null
      for (const config of configs) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(config)
          break
        } catch { /* try next */ }
      }

      if (!stream) throw new Error('无法获取摄像头')

      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('摄像头加载超时')), 10000)
        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          video.play().then(resolve).catch(reject)
        }
      })

      scanningRef.current = true
      setTimeout(() => {
        if (scanningRef.current) scanLoop()
      }, 500)
    } catch (err) {
      const e = err as Error & { name?: string }
      let msg = '摄像头启动失败'
      if (e.name === 'NotAllowedError') msg = '摄像头权限被拒绝，请在浏览器设置中允许'
      else if (e.name === 'NotFoundError') msg = '未找到摄像头设备'
      else if (e.name === 'NotReadableError') msg = '摄像头被其他应用占用'
      else if (location.protocol !== 'https:' && location.hostname !== 'localhost') msg = '摄像头需要 HTTPS 协议'
      setScanState('error')
      setErrorMsg(msg)
    }
  }, [scanLoop])

  // 打开时自动启动摄像头
  useEffect(() => {
    if (open && scanState === 'idle' && !migrationPreview) {
      startCamera()
    }
  }, [open, scanState, migrationPreview, startCamera])

  // 图片上传扫描
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let { width, height } = img
        const maxSize = 1000
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const result = scanQRFromImageDataWithRetry(imageData)
        if (result) {
          processQRCode(result)
        } else {
          toast.error('未在图片中找到二维码')
        }
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // 导入 Google Migration 密钥
  async function handleMigrationImport(selected: ParsedOTP[]) {
    if (selected.length === 0) return
    setMigrationLoading(true)
    try {
      const secrets = selected.map(s => ({
        name: s.name || s.account || '导入的密钥',
        account: s.account || '',
        secret: s.secret,
        type: s.type,
        digits: s.digits,
        algorithm: s.algorithm,
        counter: s.counter,
      }))
      await api.batchAdd(secrets)
      toast.success(`已导入 ${secrets.length} 个密钥`)
      onScanned()
      onOpenChange(false)
    } catch {
      toast.error('导入失败')
    } finally {
      setMigrationLoading(false)
    }
  }

  // Google Migration 预览界面
  if (migrationPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Authenticator 导入</DialogTitle>
            <DialogDescription>检测到 {migrationPreview.length} 个密钥</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="rounded-lg border border-outline max-h-60 overflow-y-auto">
              {migrationPreview.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-outline/50 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-on-surface truncate">{s.name || '未知服务'}</div>
                    {s.account && <div className="text-xs text-on-surface-variant truncate">{s.account}</div>}
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 bg-surface-container rounded text-on-surface-variant shrink-0">
                    {s.type}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>取消</Button>
              <Button
                className="flex-1"
                disabled={migrationLoading}
                onClick={() => handleMigrationImport(migrationPreview)}
              >
                {migrationLoading ? '导入中...' : `导入全部 ${migrationPreview.length} 个`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>扫描二维码</DialogTitle>
          <DialogDescription>将 2FA 二维码对准摄像头</DialogDescription>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* 扫描框 */}
          {scanState === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/60 rounded-2xl" />
            </div>
          )}

          {/* 错误状态 */}
          {scanState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white px-6 text-center">
              <Camera className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm mb-4">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={startCamera}>
                <RotateCcw className="w-4 h-4" />
                重试
              </Button>
            </div>
          )}

          {/* 连续扫描计数 */}
          {continuous && scanCount > 0 && (
            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              已扫描 {scanCount} 个
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={continuous}
                onChange={(e) => setContinuous(e.target.checked)}
                className="w-4 h-4 rounded border-outline accent-primary"
              />
              连续扫描
            </label>

            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                从图片识别
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </Button>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
