import { HttpClient } from "../api/HttpClient";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { ApiUserRepository } from "../repositories/ApiUserRepository";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";
import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { ApiCustomerRepository } from "../repositories/ApiCustomerRepository";
import { IAuthService } from "../../domain/services/IAuthService";
import { IAuthRepository } from "../../domain/repositories/IAuthRepository";
import { AuthService } from "../../application/services/AuthService";
import { ICashierRepository } from "../../domain/repositories/ICashierRepository";
import { ICashierService } from "../../domain/services/ICashierService";
import { UserManagementService } from "../../application/services/UserManagementService";
import { CustomerManagementService } from "../../application/services/CustomerManagementService";
import { ICustomerService } from "../../domain/services/ICustomerService";
import { IUserService } from "../../domain/services/IUserService";
import { CashierService } from "../../application/services/CashierService";
import { ApiCashierRepository } from "../repositories/ApiCashierRepository";

/**
 * Dependency Injection Container
 * Registers concrete infrastructure/application implementations once.
 */
class Container {
  private instances: Map<string, unknown> = new Map();

  constructor() {
    this.initializeContainer();
  }

  private initializeContainer(): void {
    this.register("httpClient", new HttpClient());

    this.register<IUserRepository>(
      "userRepository",
      new ApiUserRepository(this.resolve("httpClient"))
    );

    this.register<IAuthRepository>(
      "authRepository",
      new ApiAuthRepository(this.resolve("httpClient"))
    );

    this.register<ICustomerRepository>(
      "customerRepository",
      new ApiCustomerRepository(this.resolve("httpClient"))
    );
    this.register<ICashierRepository>(
      "cashierRepository",
      new ApiCashierRepository(this.resolve("httpClient"))
    );

    this.register<IAuthService>(
      "authService",
      new AuthService(this.resolve("authRepository"))
    );

    this.register<IUserService>(
      "userService",
      new UserManagementService(this.resolve("userRepository"))
    );

    this.register<ICustomerService>(
      "customerService",
      new CustomerManagementService(this.resolve("customerRepository"))
    );
    this.register<ICashierService>(
      "cashierService",
      new CashierService(this.resolve("cashierRepository"))
    );
  }

  register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  resolve<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`No instance registered for key: ${key}`);
    }
    return instance as T;
  }
}

const container = new Container();

export default container;
