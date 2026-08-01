import { User } from "../../domain/entities/User";
import { IAuthService } from "../../domain/services/IAuthService";
import { ApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository";

/**
 * Auth Service implementation
 * Contains business logic for authentication-related operations
 */
export class AuthService implements IAuthService {
  private authRepository: ApiAuthRepository;

  constructor(authRepository: ApiAuthRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Login a user with email and password
   */
  async login(identifier: string, password: string): Promise<User> {
    if (!identifier || !password) {
      throw new Error("Phone/email and password are required");
    }

    try {
      const result = await this.authRepository.login(identifier, password);
      return result.user;
    } catch (error: unknown) {
      console.error("Login failed:", error);
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error("Login failed. Please try again.");
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await this.authRepository.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.authRepository.getCurrentUser();
    } catch (error) {
      console.error("Error retrieving current user:", error);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}
