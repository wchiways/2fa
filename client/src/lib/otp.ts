/**
 * OTP 生成模块（前端版本）
 * 使用 Web Crypto API，兼容浏览器环境
 */

const CHAR_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32toByteArray(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=/g, '')
  const bits = clean
    .split('')
    .map((c) => {
      const idx = CHAR_TABLE.indexOf(c)
      if (idx === -1) throw new Error(`Invalid Base32 character: ${c}`)
      return idx.toString(2).padStart(5, '0')
    })
    .join('')

  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8)
    if (byte.length === 8) bytes.push(parseInt(byte, 2))
  }
  return new Uint8Array(bytes)
}

function getHashAlgorithm(algorithm: string): string {
  const map: Record<string, string> = {
    SHA1: 'SHA-1', 'SHA-1': 'SHA-1',
    SHA256: 'SHA-256', 'SHA-256': 'SHA-256',
    SHA512: 'SHA-512', 'SHA-512': 'SHA-512',
  }
  return map[algorithm.toUpperCase()] || 'SHA-1'
}

export interface OTPOptions {
  digits?: number
  period?: number
  algorithm?: string
  type?: 'TOTP' | 'HOTP'
  counter?: number
}

export async function generateOTP(
  secret: string,
  options: OTPOptions = {}
): Promise<string> {
  try {
    const digits = options.digits || 6
    const period = options.period || 30
    const algorithm = options.algorithm || 'SHA1'
    const type = (options.type || 'TOTP').toUpperCase()

    let counter: number
    if (type === 'HOTP') {
      counter = options.counter || 0
    } else {
      counter = Math.floor(Math.floor(Date.now() / 1000) / period)
    }

    const counterBytes = new ArrayBuffer(8)
    const view = new DataView(counterBytes)
    view.setUint32(0, Math.floor(counter / 0x100000000), false)
    view.setUint32(4, counter >>> 0, false)

    const keyBytes = base32toByteArray(secret)
    const hashAlg = getHashAlgorithm(algorithm)
    const key = await crypto.subtle.importKey(
      'raw', keyBytes as unknown as ArrayBuffer,
      { name: 'HMAC', hash: { name: hashAlg } },
      false, ['sign']
    )

    const sig = await crypto.subtle.sign('HMAC', key, counterBytes)
    const hmac = new Uint8Array(sig)

    const offset = hmac[hmac.length - 1] & 0x0f
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)

    const otp = binary % Math.pow(10, digits)
    return otp.toString().padStart(digits, '0')
  } catch {
    return '-'.repeat(options.digits || 6)
  }
}

export function getRemainingSeconds(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

export function getProgress(period = 30): number {
  return getRemainingSeconds(period) / period
}
