import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS, API_CONFIG } from "../api/constants";
import { tokenCookies } from "@/lib/cookies";

/**
 * API response types for user endpoints
 */
interface ApiUserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "STAFF";
  profileImageUrl?: string;
  createdDate: string;
  updatedDate: string;
}

interface ApiUserListResponse {
  users: ApiUserResponse[];
  totalCounts: number;
}

interface ApiResponse<T> {
  message: string;
  code: number;
  data: T;
}

/**
 * User Repository implementation for API calls
 * Handles data access for User entity through HTTP API
 */
export class ApiUserRepository implements IUserRepository {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.httpClient.get<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.BASE
      );

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      return null;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }

  /**
   * Find a user by their ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const response = await this.httpClient.get<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.GET_BY_ID,
        {
          params: { id },
        }
      );

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      return null;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    name: string;
    email: string;
    phone?: string;
    role?: "ADMIN" | "STAFF";
  }): Promise<User> {
    try {
      const response = await this.httpClient.post<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.CREATE,
        {
          name: userData.name,
          email: userData.email,
          phone: userData.phone || "",
          role: userData.role || "STAFF",
        }
      );

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      throw new Error("Failed to create user");
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Get list of users with pagination, filtering, and sorting
   */
  async getUserList(params: {
    take: number;
    skip: number;
    name?: string;
    email?: string;
    phone?: string;
    role?: "ADMIN" | "STAFF";
    sortBy?: "name" | "email" | "phone" | "role" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }): Promise<{
    users: User[];
    totalCounts: number;
  }> {
    try {
      const queryParams: Record<string, string | number> = {
        take: params.take,
        skip: params.skip,
      };

      // Add optional filtering parameters
      if (params.name) {
        queryParams.name = params.name;
      }

      if (params.email) {
        queryParams.email = params.email;
      }

      if (params.phone) {
        queryParams.phone = params.phone;
      }

      if (params.role) {
        queryParams.role = params.role;
      }

      // Add sorting parameters
      if (params.sortBy) {
        queryParams.sortBy = params.sortBy;
      }

      if (params.sortOrder) {
        queryParams.sortOrder = params.sortOrder;
      }

      const response = await this.httpClient.get<
        ApiResponse<ApiUserListResponse>
      >(API_ENDPOINTS.USERS.GET_LIST, {
        params: queryParams,
      });

      if (response.code === 200 && response.data) {
        return {
          users: response.data.users.map((user) =>
            this.mapApiResponseToUser(user)
          ),
          totalCounts: response.data.totalCounts,
        };
      }

      return {
        users: [],
        totalCounts: 0,
      };
    } catch (error) {
      console.error("Error fetching user list:", error);
      return {
        users: [],
        totalCounts: 0,
      };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(
    id: string,
    userData: {
      name?: string;
      email?: string;
      phone?: string;
      role?: "ADMIN" | "STAFF";
    }
  ): Promise<User> {
    try {
      const response = await this.httpClient.put<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.UPDATE,
        userData,
        {
          params: { id },
        }
      );

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      throw new Error("Failed to update user");
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(userData: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<User> {
    try {
      const response = await this.httpClient.put<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.UPDATE_PROFILE,
        userData
      );

      if (response.code === 200 && response.data) {
        return this.mapApiResponseToUser(response.data);
      }

      throw new Error("Failed to update profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  /**
   * Refresh current user data from server
   */
  async refreshCurrentUser(): Promise<User | null> {
    try {
      const response = await this.httpClient.get<ApiResponse<ApiUserResponse>>(
        API_ENDPOINTS.USERS.BASE
      );

      if (response.code === 200 && response.data) {
        const user = this.mapApiResponseToUser(response.data);

        // Update secure cookie with fresh data
        tokenCookies.setUser(JSON.stringify(user));

        return user;
      }

      return null;
    } catch (error) {
      console.error("Error refreshing current user:", error);
      return null;
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(profileImage: File): Promise<{
    profileImageUrl: string;
    message: string;
    refreshedUser?: User;
  }> {
    try {
      const formData = new FormData();
      formData.append("profileImage", profileImage);

      const response = await this.httpClient.post<
        ApiResponse<{
          profileImageUrl: string;
          message: string;
        }>
      >(API_ENDPOINTS.USERS.UPLOAD_PROFILE_IMAGE, formData);

      if (response.code === 200 && response.data) {
        // After successful upload, refresh user data from server
        const refreshedUser = await this.refreshCurrentUser();

        return {
          ...response.data,
          refreshedUser: refreshedUser || undefined,
        };
      }

      throw new Error(`Upload failed: ${response.message || "Unknown error"}`);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await this.httpClient.delete(API_ENDPOINTS.USERS.DELETE(id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  /**
   * Map API response to User entity
   */
  private mapApiResponseToUser(apiUser: ApiUserResponse): User {
    return new User({
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      phone: apiUser.phone,
      role: apiUser.role as "ADMIN" | "STAFF",
      profileImageUrl: this.convertToFullUrl(apiUser.profileImageUrl),
      createdDate: new Date(apiUser.createdDate),
      updatedDate: new Date(apiUser.updatedDate),
    });
  }

  private convertToFullUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${API_CONFIG.BASE_URL}${url}`;
  }
}
