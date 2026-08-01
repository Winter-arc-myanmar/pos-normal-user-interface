import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { Customer } from "../../domain/entities/Customer";
import {
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerDTOMapper,
} from "../dtos/CustomerDTO";
import { ICustomerService } from "../../domain/services/ICustomerService";

/**
 * Example application service.
 * Orchestrates customer use cases against the repository interface.
 */
export class CustomerManagementService implements ICustomerService {
  constructor(private customerRepository: ICustomerRepository) {}

  async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    if (!customerData.name?.trim()) {
      throw new Error("Name is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerData.email || !emailRegex.test(customerData.email)) {
      throw new Error("Valid email is required");
    }

    return this.customerRepository.createCustomer(customerData);
  }

  async getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO> {
    return this.customerRepository.getCustomers(params);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.customerRepository.getAllCustomers();
  }

  async getCustomerById(id: number): Promise<Customer> {
    if (id <= 0) {
      throw new Error("Invalid customer ID");
    }
    return this.customerRepository.getCustomerById(id);
  }

  async updateCustomer(
    id: number,
    customerData: UpdateCustomerDTO
  ): Promise<Customer> {
    if (id <= 0) {
      throw new Error("Invalid customer ID");
    }

    const existingCustomer = await this.customerRepository.getCustomerById(id);
    const updateData = CustomerDTOMapper.fromUpdateDTO(customerData);
    const updatedCustomer = new Customer({
      ...existingCustomer,
      ...updateData,
    });

    if (!updatedCustomer.isValid()) {
      throw new Error("Invalid customer data");
    }

    return this.customerRepository.updateCustomer(id, updateData);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    if (id <= 0) {
      throw new Error("Invalid customer ID");
    }
    return this.customerRepository.deleteCustomer(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer> {
    if (!email?.includes("@")) {
      throw new Error("Invalid email address");
    }
    return this.customerRepository.getCustomerByEmail(email);
  }

  async getCustomerByPhone(phone: string): Promise<Customer> {
    if (!phone || phone.length < 10) {
      throw new Error("Invalid phone number");
    }
    return this.customerRepository.getCustomerByPhone(phone);
  }

  async searchCustomers(
    query: string,
    take?: number,
    skip?: number
  ): Promise<CustomerDomainListResponseDTO> {
    if (!query || query.trim().length < 2) {
      throw new Error("Search query must be at least 2 characters long");
    }

    const trimmedQuery = query.trim();

    const nameResults = await this.customerRepository.getCustomers({
      name: trimmedQuery,
      take,
      skip,
    });
    if (nameResults.customers.length > 0) {
      return nameResults;
    }

    const emailResults = await this.customerRepository.getCustomers({
      email: trimmedQuery,
      take,
      skip,
    });
    if (emailResults.customers.length > 0) {
      return emailResults;
    }

    return this.customerRepository.getCustomers({
      phone: trimmedQuery,
      take,
      skip,
    });
  }
}
