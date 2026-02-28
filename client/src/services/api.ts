/**
 * API 服务层
 * 封装与 Worker 后端的通信
 */

export interface Secret {
  id: string
  name: string
  account?: string
  secret: string
  type?: 'TOTP' | 'HOTP'
  digits?: number
  period?: number
  algorithm?: string
  counter?: number
  createdAt?: string
  updatedAt?: string
}

export interface Backup {
  key: string
  timestamp: string
  count: number
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    window.location.href = '/'
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(res.status, body.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Auth
  login: (password: string) =>
    request<{ success: boolean }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  refreshToken: () =>
    request<{ success: boolean }>('/api/refresh-token', {
      method: 'POST',
    }),

  // Secrets
  getSecrets: () =>
    request<{ secrets: Secret[] }>('/api/secrets'),

  addSecret: (secret: Partial<Secret>) =>
    request<{ success: boolean; secret: Secret }>('/api/secrets', {
      method: 'POST',
      body: JSON.stringify(secret),
    }),

  updateSecret: (id: string, secret: Partial<Secret>) =>
    request<{ success: boolean }>(`/api/secrets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...secret, id }),
    }),

  deleteSecret: (id: string) =>
    request<{ success: boolean }>(`/api/secrets/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),

  batchAdd: (secrets: Partial<Secret>[]) =>
    request<{ success: boolean; added: number }>('/api/secrets/batch', {
      method: 'POST',
      body: JSON.stringify({ secrets }),
    }),

  // Backup
  getBackups: () =>
    request<{ backups: Backup[] }>('/api/backup'),

  createBackup: () =>
    request<{ success: boolean }>('/api/backup', { method: 'POST' }),

  restoreBackup: (backupKey: string) =>
    request<{ success: boolean }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupKey }),
    }),
}
