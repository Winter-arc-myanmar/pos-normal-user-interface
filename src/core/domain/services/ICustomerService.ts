import { Customer } from "../entities/Customer";
import {
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
} from "../../application/dtos/CustomerDTO";

export interface ICustomerService {
  createCustomer(customerData: CreateCustomerDTO): Promise<Customer>;
  getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO>;
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer>;
  updateCustomer(
    id: number,
    customerData: UpdateCustomerDTO
  ): Promise<Customer>;
  deleteCustomer(id: number): Promise<boolean>;
  getCustomerByEmail(email: string): Promise<Customer>;
  getCustomerByPhone(phone: string): Promise<Customer>;
  searchCustomers(
    query: string,
    take?: number,
    skip?: number
  ): Promise<CustomerDomainListResponseDTO>;
}
