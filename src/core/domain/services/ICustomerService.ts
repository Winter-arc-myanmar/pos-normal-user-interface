import { Customer, CustomerInteraction } from "../entities/Customer";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerInteractionFilterDTO,
  CustomerInteractionListResponseDTO,
  UpdateCustomerDTO,
  UpdateCustomerInteractionDTO,
} from "../../application/dtos/CustomerDTO";

export interface ICustomerService {
  createCustomer(customerData: CreateCustomerDTO): Promise<Customer>;
  getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO>;
  getCustomerById(id: string): Promise<Customer>;
  updateCustomer(id: string, customerData: UpdateCustomerDTO): Promise<Customer>;
  deleteCustomer(id: string): Promise<boolean>;
  getCustomerInteractions(
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO>;
  getCustomerInteractionById(id: string): Promise<CustomerInteraction>;
  getInteractionsForCustomer(
    customerId: string,
    params?: CustomerInteractionFilterDTO
  ): Promise<CustomerInteractionListResponseDTO>;
  getInteractionForCustomer(
    customerId: string,
    id: string
  ): Promise<CustomerInteraction>;
  createCustomerInteraction(
    customerId: string,
    payload: CreateCustomerInteractionDTO
  ): Promise<CustomerInteraction>;
  updateCustomerInteraction(
    customerId: string,
    id: string,
    payload: UpdateCustomerInteractionDTO
  ): Promise<CustomerInteraction>;
  deleteCustomerInteraction(customerId: string, id: string): Promise<boolean>;
}
