import { User } from "../entities/User";
import {
  LoginInputDTO,
  SetActiveBranchRequestDTO,
} from "../../application/dtos/AuthDTO";

/**
 * Interface for authentication service
 */
export interface IAuthService {
  /**
   * Login with tenant user or system admin credentials.
   */
  login(input: LoginInputDTO): Promise<User>;

  /**
   * Switch active branch and refresh auth session token.
   */
  setActiveBranch(payload: SetActiveBranchRequestDTO): Promise<User>;

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
