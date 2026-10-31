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
  /** Fails, signing this device out, once the account signs in on another POS device. */
  checkSession(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}
