import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../../domain/entities/User";
import { IAuthService } from "../../domain/services/IAuthService";
import container from "../../infrastructure/di/container";
import { tokenCookies } from "@/lib/cookies";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  error: string | null;
}

// Create context with default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props type
interface AuthProviderProps {
  children: ReactNode;
  service?: IAuthService;
}

/**
 * Auth Provider component that uses the Auth Service
 */
export function AuthProvider({ children, service }: AuthProviderProps) {
  // Get the auth service from container if not provided
  const authService = service || container.resolve<IAuthService>("authService");

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on first load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [authService]);

  // Login function
  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      const loggedInUser = await authService.login(identifier, password);
      setUser(loggedInUser);
      setError(null); // Clear error on success
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during login");
      }
      throw err; // Re-throw to allow component to handle
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user function
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem("wms_user", JSON.stringify(updatedUser));
    tokenCookies.setUser(JSON.stringify(updatedUser));
  };

  // Context value
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the auth context
 */
// Provider + hook in one module (same pattern as warehouse-management-fe)
// eslint-disable-next-line react-refresh/only-export-components -- useAuth + AuthProvider
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
