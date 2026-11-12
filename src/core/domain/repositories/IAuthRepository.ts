import {
  AuthResultDTO,
  ChangePasswordRequestDTO,
  SetActiveBranchRequestDTO,
  SignInRequestDTO,
} from "../../application/dtos/AuthDTO";
import { User } from "../entities/User";

export interface IAuthRepository {
  login(payload: SignInRequestDTO): Promise<AuthResultDTO>;
  setActiveBranch(payload: SetActiveBranchRequestDTO): Promise<AuthResultDTO>;
  /** Returns whether the server actually changed the signed-in person's password. */
  changePassword(payload: ChangePasswordRequestDTO): Promise<boolean>;
  logout(): Promise<void>;
  /** Fails, signing this device out, once the account signs in on another POS device. */
  checkSession(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}
