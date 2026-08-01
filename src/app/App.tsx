import { NetworkStatusGate } from '@/components/NetworkStatusGate'
import { AuthProvider } from '@/core/presentation/hooks/useAuth'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AppRouter } from './router/AppRouter'

export function App() {
  return (
    <ThemeProvider>
      <NetworkStatusGate>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </NetworkStatusGate>
    </ThemeProvider>
  )
}
