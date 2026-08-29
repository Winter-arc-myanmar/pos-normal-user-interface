import { NetworkStatusGate } from '@/components/NetworkStatusGate'
import { AuthProvider } from '@/core/presentation/hooks/useAuth'
import { PosWorkspaceProvider } from '@/core/presentation/hooks/usePosWorkspace'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AppRouter } from './router/AppRouter'

export function App() {
  return (
    <ThemeProvider>
      <NetworkStatusGate>
        <AuthProvider>
          <PosWorkspaceProvider>
            <AppRouter />
          </PosWorkspaceProvider>
        </AuthProvider>
      </NetworkStatusGate>
    </ThemeProvider>
  )
}
