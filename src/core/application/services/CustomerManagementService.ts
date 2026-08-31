import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { Customer, CustomerInteraction } from "../../domain/entities/Customer";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerInteractionFilterDTO,
  CustomerInteractionListResponseDTO,
  UpdateCustomerDTO,
  UpdateCustomerInteractionDTO,
} from "../dtos/CustomerDTO";
import { ICustomerService } from "../../domain/services/ICustomerService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CustomerManagementService implements ICustomerService {
  constructor(private customerRepository: ICustomerRepository) {}

  async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    if (!customerData.name?.trim()) {
      throw new Error("Name is required");
    }
    if (!customerData.tenantId?.trim()) {
      throw new Error("Tenant is required");
    }
    if (customerData.email && !emailRegex.test(customerData.email)) {
      throw new Error("Valid email is required");
    }
    return this.customerRepository.createCustomer(customerData);
  }

  async getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO> {
    return this.customerRepository.getCustomers(params);
  }

  async getCustomerById(id: string): Promise<Customer> {
    if (!id) {
      throw new Error("Invalid customer ID");
    }
    return this.customerRepository.getCustomerById(id);
  }

  async updateCustomer(
    id: string,
    customerData: UpdateCustomerDTO
  ): Promise<Customer> {
    if (!id) {
      throw new Error("Invalid customer ID");
    }
    if (customerData.email && !emailRegex.test(customerData.email)) {
      throw new Error("Valid email is required");
    }
    return this.customerRepository.updateCustomer(id, customerData);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Invalid customer ID");
    }
    return this.customerRepository.deleteCustomer(id);
  }

  async getCustomerInteractions(
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO> {
    return this.customerRepository.getCustomerInteractions(params);
  }

  async getCustomerInteractionById(id: string): Promise<CustomerInteraction> {
    if (!id) {
      throw new Error("Invalid interaction ID");
    }
    return this.customerRepository.getCustomerInteractionById(id);
  }

  async getInteractionsForCustomer(
    customerId: string,
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO> {
    if (!customerId) {
      throw new Error("Invalid customer ID");
    }
    return this.customerRepository.getInteractionsForCustomer(
      customerId,
      params
    );
  }

  async getInteractionForCustomer(
    customerId: string,
    id: string
  ): Promise<CustomerInteraction> {
    if (!customerId || !id) {
      throw new Error("Invalid interaction ID");
    }
    return this.customerRepository.getInteractionForCustomer(customerId, id);
  }

  async createCustomerInteraction(
    customerId: string,
    payload: CreateCustomerInteractionDTO
  ): Promise<CustomerInteraction> {
    if (!customerId) {
      throw new Error("Invalid customer ID");
    }
    if (!payload.summary?.trim()) {
      throw new Error("Summary is required");
    }
    if (!payload.interactionChannel?.trim()) {
      throw new Error("Interaction channel is required");
    }
    if (!payload.interactionType?.trim()) {
      throw new Error("Interaction type is required");
    }
    return this.customerRepository.createCustomerInteraction(
      customerId,
      payload
    );
  }

  async updateCustomerInteraction(
    customerId: string,
    id: string,
    payload: UpdateCustomerInteractionDTO
  ): Promise<CustomerInteraction> {
    if (!customerId || !id) {
      throw new Error("Invalid interaction ID");
    }
    return this.customerRepository.updateCustomerInteraction(
      customerId,
      id,
      payload
    );
  }

  async deleteCustomerInteraction(
    customerId: string,
    id: string
  ): Promise<boolean> {
    if (!customerId || !id) {
      throw new Error("Invalid interaction ID");
    }
    return this.customerRepository.deleteCustomerInteraction(customerId, id);
  }
}
