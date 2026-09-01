import { NetworkStatusGate } from '@/components/NetworkStatusGate'
import { AuthProvider } from '@/core/presentation/hooks/useAuth'
import { PosWorkspaceProvider } from '@/core/presentation/hooks/usePosWorkspace'
import { AppRouter } from './router/AppRouter'

export function App() {
  return (
    <NetworkStatusGate>
      <AuthProvider>
        <PosWorkspaceProvider>
          <AppRouter />
        </PosWorkspaceProvider>
      </AuthProvider>
    </NetworkStatusGate>
  )
}
