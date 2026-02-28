import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SetupPageProps {
  onSetupComplete: () => void
}

export function SetupPage({ onSetupComplete }: SetupPageProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('密码长度至少 8 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || '设置失败')
        return
      }
      onSetupComplete()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-on-surface">欢迎使用两步验证</h1>
          <p className="text-sm text-on-surface-variant mt-1 text-center">
            设置管理密码以保护您的 2FA 密钥
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">管理密码</label>
            <Input
              type="password"
              placeholder="至少 8 位，含大小写字母、数字和符号"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">确认密码</label>
            <Input
              type="password"
              placeholder="再次输入密码"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full h-12 text-base"
          >
            {loading ? '设置中...' : '开始使用'}
          </Button>
        </form>

        <p className="text-xs text-on-surface-variant text-center mt-6">
          密码要求：至少 8 位，包含大小写字母、数字和特殊字符
        </p>
      </div>
    </div>
  )
}
