import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    const ok = await login(password)
    if (!ok) {
      setError('密码错误')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-on-surface">两步验证</h1>
          <p className="text-sm text-on-surface-variant mt-1">输入密码以访问您的密钥</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="管理密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-12 text-base"
            />
            {error && (
              <p className="text-sm text-error mt-2">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-12 text-base"
          >
            {loading ? '验证中...' : '登录'}
          </Button>
        </form>
      </div>
    </div>
  )
}
