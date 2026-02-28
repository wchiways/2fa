import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '@/services/api'

type AuthState = 'loading' | 'setup' | 'login' | 'authenticated'

interface AuthContextType {
  state: AuthState
  login: (password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
  onSetupComplete: () => void
}

const AuthContext = createContext<AuthContextType>({
  state: 'loading',
  login: async () => false,
  logout: () => {},
  checkAuth: async () => {},
  onSetupComplete: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading')

  const checkAuth = useCallback(async () => {
    try {
      await api.getSecrets()
      setState('authenticated')
    } catch (err: unknown) {
      // 503 = 未设置密码，需要首次设置
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 503) {
        setState('setup')
      } else {
        setState('login')
      }
    }
  }, [])

  const login = useCallback(async (password: string) => {
    try {
      await api.login(password)
      setState('authenticated')
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setState('login')
    window.location.reload()
  }, [])

  const onSetupComplete = useCallback(() => {
    setState('login')
  }, [])

  return (
    <AuthContext.Provider value={{ state, login, logout, checkAuth, onSetupComplete }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
