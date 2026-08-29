import {
  AuthResultDTO,
  SetActiveBranchRequestDTO,
  SignInRequestDTO,
} from "../../application/dtos/AuthDTO";
import { User } from "../entities/User";

export interface IAuthRepository {
  login(payload: SignInRequestDTO): Promise<AuthResultDTO>;
  setActiveBranch(payload: SetActiveBranchRequestDTO): Promise<AuthResultDTO>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}
