/**
 * QR 码工具函数
 * 包含 QR 码生成、OTPAuth URL 解析、Google Migration 解析
 */
import jsQR from 'jsqr'
import qrcode from 'qrcode-generator'

// ==================== QR 码生成 ====================

export function generateQRCodeDataURL(text: string, size = 200): string {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()

  const moduleCount = qr.getModuleCount()
  const margin = 2
  const cellSize = Math.floor(size / (moduleCount + margin * 2))
  const actualSize = (moduleCount + margin * 2) * cellSize

  const canvas = document.createElement('canvas')
  canvas.width = actualSize
  canvas.height = actualSize
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, actualSize, actualSize)

  ctx.fillStyle = '#000000'
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize)
      }
    }
  }

  return canvas.toDataURL('image/png')
}

// ==================== QR 码扫描 ====================

export function scanQRFromImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  })
  return result?.data || null
}

export function scanQRFromImageDataWithRetry(imageData: ImageData): string | null {
  const options: Array<{ inversionAttempts: 'dontInvert' | 'onlyInvert' | 'attemptBoth' }> = [
    { inversionAttempts: 'dontInvert' },
    { inversionAttempts: 'onlyInvert' },
    { inversionAttempts: 'attemptBoth' },
  ]

  for (const opt of options) {
    const result = jsQR(imageData.data, imageData.width, imageData.height, opt)
    if (result?.data) return result.data
  }
  return null
}

// ==================== OTPAuth URL 构建 ====================

export interface ParsedOTP {
  name: string
  account: string
  secret: string
  type: 'TOTP' | 'HOTP'
  digits: number
  period: number
  algorithm: string
  counter: number
}

export function buildOTPAuthURL(secret: {
  name: string
  account?: string
  secret: string
  type?: string
  digits?: number
  period?: number
  algorithm?: string
  counter?: number
}): string {
  const serviceName = (secret.name || '').trim()
  const accountName = (secret.account || '').trim()
  const label = accountName
    ? `${encodeURIComponent(serviceName)}:${encodeURIComponent(accountName)}`
    : encodeURIComponent(serviceName)

  const type = (secret.type || 'TOTP').toUpperCase()
  const scheme = type === 'HOTP' ? 'hotp' : 'totp'

  const params = new URLSearchParams({
    secret: secret.secret.toUpperCase(),
    issuer: serviceName,
    algorithm: secret.algorithm || 'SHA1',
    digits: (secret.digits || 6).toString(),
  })

  if (type === 'HOTP') {
    params.set('counter', (secret.counter || 0).toString())
  } else {
    params.set('period', (secret.period || 30).toString())
  }

  return `otpauth://${scheme}/${label}?${params.toString()}`
}

// ==================== OTPAuth URL 解析 ====================

export function parseOTPAuthURL(url: string): ParsedOTP | null {
  try {
    if (!url.startsWith('otpauth://totp/') && !url.startsWith('otpauth://hotp/')) return null

    const parsed = new URL(url)
    const pathParts = decodeURIComponent(parsed.pathname.substring(1)).split(':')
    const params = parsed.searchParams

    const issuer = params.get('issuer') || (pathParts.length > 1 ? pathParts[0] : '')
    const account = pathParts.length > 1 ? pathParts[1] : pathParts[0]
    const secret = params.get('secret')
    if (!secret) return null

    const type = url.startsWith('otpauth://hotp/') ? 'HOTP' : 'TOTP'

    return {
      name: issuer || account || 'Unknown',
      account: account || '',
      secret,
      type,
      digits: parseInt(params.get('digits') || '6'),
      period: parseInt(params.get('period') || '30'),
      algorithm: params.get('algorithm') || 'SHA1',
      counter: parseInt(params.get('counter') || '0'),
    }
  } catch {
    return null
  }
}

// ==================== Google Migration 解析 ====================

function bytesToBase32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += alphabet[(value >> bits) & 0x1f]
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f]
  }
  return result
}

function parseOtpParameters(data: Uint8Array): ParsedOTP {
  const otp: ParsedOTP = {
    secret: '', name: '', account: '', algorithm: 'SHA1',
    digits: 6, type: 'TOTP', counter: 0, period: 30,
  }

  let p = 0
  while (p < data.length) {
    const tag = data[p++]
    const fieldNumber = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 0) {
      let val = 0, shift = 0
      while (p < data.length) {
        const byte = data[p++]
        val |= (byte & 0x7f) << shift
        if ((byte & 0x80) === 0) break
        shift += 7
      }
      switch (fieldNumber) {
        case 4: otp.algorithm = ['SHA1', 'SHA1', 'SHA256', 'SHA512', 'MD5'][val] || 'SHA1'; break
        case 5: otp.digits = val === 2 ? 8 : 6; break
        case 6: otp.type = val === 1 ? 'HOTP' : 'TOTP'; break
        case 7: otp.counter = val; break
      }
    } else if (wireType === 2) {
      let length = 0, shift = 0
      while (p < data.length) {
        const byte = data[p++]
        length |= (byte & 0x7f) << shift
        if ((byte & 0x80) === 0) break
        shift += 7
      }
      const fieldData = data.slice(p, p + length)
      p += length
      switch (fieldNumber) {
        case 1: otp.secret = bytesToBase32(fieldData); break
        case 2: otp.name = new TextDecoder().decode(fieldData); break
        case 3: {
          const issuer = new TextDecoder().decode(fieldData)
          // issuer 优先作为 name，原 name 作为 account
          if (issuer) {
            otp.account = otp.name
            otp.name = issuer
          }
          break
        }
      }
    }
  }
  return otp
}

export function parseGoogleMigration(qrData: string): ParsedOTP[] {
  const url = new URL(qrData)
  const dataParam = url.searchParams.get('data')
  if (!dataParam) return []

  const base64Data = decodeURIComponent(dataParam)
  const binaryData = atob(base64Data)
  const bytes = new Uint8Array(binaryData.length)
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i)
  }

  const secrets: ParsedOTP[] = []
  let pos = 0

  function readVarint() {
    let result = 0, shift = 0
    while (pos < bytes.length) {
      const byte = bytes[pos++]
      result |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
    }
    return result
  }

  while (pos < bytes.length) {
    const tag = bytes[pos++]
    const fieldNumber = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 0) {
      readVarint()
    } else if (wireType === 2) {
      const length = readVarint()
      if (fieldNumber === 1) {
        const otpData = bytes.slice(pos, pos + length)
        pos += length
        const otp = parseOtpParameters(otpData)
        if (otp.secret) secrets.push(otp)
      } else {
        pos += length
      }
    }
  }

  return secrets
}
