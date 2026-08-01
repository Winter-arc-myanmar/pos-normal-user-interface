import { User } from "../entities/User";

/**
 * Interface for authentication service
 */
export interface IAuthService {
  /**
   * Login a user with email and password
   */
  login(identifier: string, password: string): Promise<User>;

  /**
   * Logout the current user
   */
  logout(): Promise<void>;

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): Promise<boolean>;
}
