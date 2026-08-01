import { User } from "../entities/User";
import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateProfileDTO,
  UserListRequestDTO,
  UserDomainListResponseDTO,
} from "../../application/dtos/UserDTO";

/**
 * Interface for the User Repository
 * This defines contracts that any user repository implementation must fulfill
 */
export interface IUserRepository {
  /**
   * Get current user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Find a user by their ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Create a new user
   */
  createUser(userData: CreateUserDTO): Promise<User>;

  /**
   * Get list of users with pagination, filtering, and sorting
   */
  getUserList(params: UserListRequestDTO): Promise<UserDomainListResponseDTO>;

  /**
   * Update an existing user
   */
  updateUser(id: string, userData: UpdateUserDTO): Promise<User>;

  /**
   * Update current user profile
   */
  updateProfile(userData: UpdateProfileDTO): Promise<User>;

  /**
   * Upload profile image
   */
  uploadProfileImage(profileImage: File): Promise<{
    profileImageUrl: string;
    message: string;
    refreshedUser?: User;
  }>;

  /**
   * Delete a user
   */
  deleteUser(id: string): Promise<void>;
}
