import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/hooks/useTheme'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { SetupPage } from '@/pages/SetupPage'

function AppContent() {
  const { state, checkAuth, onSetupComplete } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  switch (state) {
    case 'loading':
      return (
        <div className="flex items-center justify-center min-h-dvh bg-surface">
          <div className="text-on-surface-variant text-sm">加载中...</div>
        </div>
      )
    case 'setup':
      return <SetupPage onSetupComplete={onSetupComplete} />
    case 'login':
      return <LoginPage />
    case 'authenticated':
      return <HomePage />
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'bg-surface-container text-on-surface border-outline text-sm',
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  )
}
