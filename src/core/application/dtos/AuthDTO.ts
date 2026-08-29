import { User } from "../../domain/entities/User";

export type AuthSignInTypeDTO = "user";

export interface BranchAccessDTO {
  branchId: string;
  roles: string[];
  permissions: string[];
}

export interface LoginInputDTO {
  email: string;
  password: string;
}

export interface SignInRequestDTO {
  email: string;
  password: string;
  type: AuthSignInTypeDTO;
}

export interface SetActiveBranchRequestDTO {
  branchId: string;
}

export interface AuthSessionUserDTO {
  id: string;
  email: string;
  fullName: string;
  type: string;
  tenantId: string;
}

export interface AuthSessionPayloadDTO {
  access_token: string;
  user: AuthSessionUserDTO;
  activeBranch: string;
  access: BranchAccessDTO[];
}

export interface ApiEnvelopeDTO<T> {
  success?: boolean;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  data: T;
}

export interface AuthResultDTO {
  user: User;
  token: string;
  activeBranch: string;
  access: BranchAccessDTO[];
}
