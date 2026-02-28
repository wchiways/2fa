import { useState, useEffect, useCallback } from 'react'
import { generateOTP, getRemainingSeconds, type OTPOptions } from '@/lib/otp'

interface UseOTPResult {
  code: string
  progress: number
  remaining: number
}

export function useOTP(secret: string, options: OTPOptions = {}): UseOTPResult {
  const period = options.period || 30
  const [code, setCode] = useState('------')
  const [remaining, setRemaining] = useState(period)

  const generate = useCallback(async () => {
    const otp = await generateOTP(secret, options)
    setCode(otp)
  }, [secret, options.digits, options.period, options.algorithm, options.type, options.counter])

  useEffect(() => {
    generate()

    const interval = setInterval(() => {
      const r = getRemainingSeconds(period)
      setRemaining(r)

      // 当倒计时归零时重新生成
      if (r === period) {
        generate()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [generate, period])

  return {
    code,
    progress: remaining / period,
    remaining,
  }
}
