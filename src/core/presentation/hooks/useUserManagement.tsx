import { useState, useEffect, useCallback } from "react";
import { User } from "../../domain/entities/User";
import { IUserService } from "../../domain/services/IUserService";
import {
  UserListRequestDTO,
  UpdateUserDTO,
  UpdateProfileDTO,
  CreateUserDTO,
  UserDomainListResponseDTO,
} from "../../application/dtos/UserDTO";
import container from "../../infrastructure/di/container";

interface UseUserManagementReturn {
  // State
  users: User[];
  totalUsers: number;
  currentUser: User | null;
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadUsers: (params: UserListRequestDTO) => Promise<void>;
  loadUserById: (id: string) => Promise<void>;
  createUser: (userData: CreateUserDTO) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserDTO) => Promise<void>;
  updateProfile: (userData: UpdateProfileDTO) => Promise<User>;
  uploadProfileImage: (profileImage: File) => Promise<{
    profileImageUrl: string;
    message: string;
    refreshedUser?: User;
  }>;
  deleteUser: (id: string) => Promise<void>;
  searchUsers: (name: string, take?: number, skip?: number) => Promise<void>;
  searchUsersByEmail: (
    email: string,
    take?: number,
    skip?: number
  ) => Promise<void>;
  searchUsersByPhone: (
    phone: string,
    take?: number,
    skip?: number
  ) => Promise<void>;
  filterByRole: (
    role: "ADMIN" | "STAFF",
    take?: number,
    skip?: number
  ) => Promise<void>;
  loadUsersWithSorting: (
    take?: number,
    skip?: number,
    sortBy?: "name" | "email" | "phone" | "role" | "createdAt" | "updatedAt",
    sortOrder?: "asc" | "desc"
  ) => Promise<void>;
  clearError: () => void;
  clearSelectedUser: () => void;
}

/**
 * Custom hook for user management operations
 */
export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get service from container
  const userManagementService = container.resolve<IUserService>("userService");

  // Load current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setIsLoading(true);
        const user = await userManagementService.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Error loading current user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, [userManagementService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSelectedUser = useCallback(() => {
    setSelectedUser(null);
  }, []);

  /**
   * Load users with pagination and filtering
   */
  const loadUsers = useCallback(
    async (params: UserListRequestDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.getUserList(params);

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load users";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Load user by ID
   */
  const loadUserById = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();

        const user = await userManagementService.getUserById(id);
        setSelectedUser(user);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load user";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Create a new user
   */
  const createUser = useCallback(
    async (userData: CreateUserDTO): Promise<User> => {
      try {
        setIsLoading(true);
        clearError();

        const newUser = await userManagementService.createUser(userData);

        // Add new user to the list
        setUsers((prevUsers) => [...prevUsers, newUser]);
        setTotalUsers((prevTotal) => prevTotal + 1);
        return newUser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create user";
        setError(errorMessage);
        throw err; // Re-throw to handle in component
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Update user
   */
  const updateUser = useCallback(
    async (id: string, userData: UpdateUserDTO) => {
      try {
        setIsLoading(true);
        clearError();

        const updatedUser = await userManagementService.updateUser(
          id,
          userData
        );

        // Update user in the list
        setUsers((prevUsers) =>
          prevUsers.map((user) => (user.id === id ? updatedUser : user))
        );

        // Update selected user if it's the same
        if (selectedUser?.id === id) {
          setSelectedUser(updatedUser);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update user";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService, selectedUser]
  );

  /**
   * Update current user profile
   */
  const updateProfile = useCallback(
    async (userData: UpdateProfileDTO): Promise<User> => {
      try {
        setIsLoading(true);
        clearError();

        const updatedUser = await userManagementService.updateProfile(userData);
        setCurrentUser(updatedUser);
        return updatedUser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Upload profile image
   */
  const uploadProfileImage = useCallback(
    async (profileImage: File) => {
      try {
        setIsLoading(true);
        clearError();

        const result = await userManagementService.uploadProfileImage(
          profileImage
        );
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload profile image";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Delete user
   */
  const deleteUser = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();

        await userManagementService.deleteUser(id);

        // Remove user from the list
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
        setTotalUsers((prev) => prev - 1);

        // Clear selected user if it's the deleted one
        if (selectedUser?.id === id) {
          setSelectedUser(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete user";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService, selectedUser]
  );

  /**
   * Search users by name
   */
  const searchUsers = useCallback(
    async (name: string, take: number = 10, skip: number = 0) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.searchUsersByName(name, take, skip);

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search users";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Search users by email
   */
  const searchUsersByEmail = useCallback(
    async (email: string, take: number = 10, skip: number = 0) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.searchUsersByEmail(email, take, skip);

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search users by email";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Search users by phone
   */
  const searchUsersByPhone = useCallback(
    async (phone: string, take: number = 10, skip: number = 0) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.searchUsersByPhone(phone, take, skip);

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to search users by phone";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Filter users by role
   */
  const filterByRole = useCallback(
    async (role: "ADMIN" | "STAFF", take: number = 10, skip: number = 0) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.getUsersByRole(role, take, skip);

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to filter users";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  /**
   * Load users with sorting
   */
  const loadUsersWithSorting = useCallback(
    async (
      take: number = 10,
      skip: number = 0,
      sortBy:
        | "name"
        | "email"
        | "phone"
        | "role"
        | "createdAt"
        | "updatedAt" = "createdAt",
      sortOrder: "asc" | "desc" = "asc"
    ) => {
      try {
        setIsLoading(true);
        clearError();

        const result: UserDomainListResponseDTO =
          await userManagementService.getUsersWithSorting(
            take,
            skip,
            sortBy,
            sortOrder
          );

        setUsers(result.users);
        setTotalUsers(result.totalCounts);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load users with sorting";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, userManagementService]
  );

  return {
    // State
    users,
    totalUsers,
    currentUser,
    selectedUser,
    isLoading,
    error,

    // Actions
    loadUsers,
    loadUserById,
    createUser,
    updateUser,
    updateProfile,
    uploadProfileImage,
    deleteUser,
    searchUsers,
    searchUsersByEmail,
    searchUsersByPhone,
    filterByRole,
    loadUsersWithSorting,
    clearError,
    clearSelectedUser,
  };
}
