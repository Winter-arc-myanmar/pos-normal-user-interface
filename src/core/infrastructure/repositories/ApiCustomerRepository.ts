import { ICustomerRepository } from "../../domain/repositories/ICustomerRepository";
import { Customer } from "../../domain/entities/Customer";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";
import {
  CreateCustomerDTO,
  CustomerFilterDTO,
  CustomerDomainListResponseDTO,
  CustomerDTOMapper,
} from "../../application/dtos/CustomerDTO";

interface ApiResponseData {
  data?: unknown;
  customer?: Record<string, unknown>;
  customers?:
    | Record<string, unknown>[]
    | {
        data?: Record<string, unknown>[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
      };
  items?: Record<string, unknown>[];
  id?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

function toCustomerList(
  items: Record<string, unknown>[],
  total = items.length,
  page = 1,
  limit = items.length || 10,
  totalPages = 1,
  hasNextPage = false,
  hasPrevPage = false
): CustomerDomainListResponseDTO {
  return CustomerDTOMapper.toDomainListResponseDTO(
    items.map((item) => new Customer(item)),
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage
  );
}

function parseCustomer(responseData: ApiResponseData): Customer {
  if (responseData.customer) {
    return new Customer(responseData.customer);
  }
  if (responseData.data && typeof responseData.data === "object") {
    return new Customer(responseData.data as Record<string, unknown>);
  }
  if (responseData.id) {
    return new Customer(responseData);
  }
  throw new Error(
    `Unexpected API response structure: ${JSON.stringify(responseData)}`
  );
}

/**
 * Example API repository implementation for the Customer resource.
 */
export class ApiCustomerRepository implements ICustomerRepository {
  constructor(private httpClient: HttpClient) {}

  async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.CUSTOMERS.CREATE,
      customerData
    );
    return parseCustomer((response as { data: ApiResponseData }).data);
  }

  async getCustomers(
    params?: CustomerFilterDTO
  ): Promise<CustomerDomainListResponseDTO> {
    const queryParams = new URLSearchParams();

    if (params?.skip !== undefined) {
      queryParams.append("skip", params.skip.toString());
    }
    if (params?.take !== undefined) {
      queryParams.append("take", params.take.toString());
    }
    if (params?.name) queryParams.append("name", params.name);
    if (params?.phone) queryParams.append("phone", params.phone);
    if (params?.email) queryParams.append("email", params.email);
    if (params?.address) queryParams.append("address", params.address);
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const url = `${API_ENDPOINTS.CUSTOMERS.GET_ALL}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await this.httpClient.get(url);
    const responseData = (response as { data: ApiResponseData }).data;

    if (
      responseData.customers &&
      !Array.isArray(responseData.customers) &&
      Array.isArray(responseData.customers.data)
    ) {
      const pageData = responseData.customers;
      return toCustomerList(
        pageData.data || [],
        pageData.total || 0,
        pageData.page || 1,
        pageData.limit || 10,
        pageData.totalPages || 1,
        pageData.hasNextPage || false,
        pageData.hasPrevPage || false
      );
    }

    if (Array.isArray(responseData.customers)) {
      return toCustomerList(responseData.customers);
    }

    if (Array.isArray(responseData)) {
      return toCustomerList(responseData as unknown as Record<string, unknown>[]);
    }

    if (Array.isArray(responseData.data)) {
      return toCustomerList(
        responseData.data as Record<string, unknown>[],
        responseData.total || (responseData.data as unknown[]).length,
        responseData.page || 1,
        responseData.limit || (responseData.data as unknown[]).length,
        responseData.totalPages || 1,
        responseData.hasNextPage || false,
        responseData.hasPrevPage || false
      );
    }

    if (Array.isArray(responseData.items)) {
      return toCustomerList(
        responseData.items,
        responseData.total || responseData.items.length,
        responseData.page || 1,
        responseData.limit || responseData.items.length,
        responseData.totalPages || 1,
        responseData.hasNextPage || false,
        responseData.hasPrevPage || false
      );
    }

    throw new Error(
      `Unexpected API response structure: ${JSON.stringify(responseData)}`
    );
  }

  async getAllCustomers(): Promise<Customer[]> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_ALL_NO_PAGINATION
    );
    const responseData = (response as { data: ApiResponseData }).data;

    if (Array.isArray(responseData.customers)) {
      return responseData.customers.map((customer) => new Customer(customer));
    }
    if (Array.isArray(responseData)) {
      return (responseData as unknown as Record<string, unknown>[]).map(
        (customer) => new Customer(customer)
      );
    }
    if (Array.isArray(responseData.data)) {
      return (responseData.data as Record<string, unknown>[]).map(
        (customer) => new Customer(customer)
      );
    }

    throw new Error(
      `Unexpected API response structure for getAllCustomers: ${JSON.stringify(
        responseData
      )}`
    );
  }

  async getCustomerById(id: number): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_ID(id.toString())
    );
    return parseCustomer((response as { data: ApiResponseData }).data);
  }

  async updateCustomer(
    id: number,
    customerData: Partial<Customer>
  ): Promise<Customer> {
    const response = await this.httpClient.put(
      API_ENDPOINTS.CUSTOMERS.UPDATE(id.toString()),
      customerData
    );
    return parseCustomer((response as { data: ApiResponseData }).data);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const response = await this.httpClient.delete(
      API_ENDPOINTS.CUSTOMERS.DELETE(id.toString())
    );
    const responseData = (response as { data: ApiResponseData }).data;

    if (typeof responseData === "boolean") return responseData;
    if (responseData && typeof responseData.success === "boolean") {
      return responseData.success;
    }
    return true;
  }

  async getCustomerByEmail(email: string): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_EMAIL(email)
    );
    return parseCustomer((response as { data: ApiResponseData }).data);
  }

  async getCustomerByPhone(phone: string): Promise<Customer> {
    const response = await this.httpClient.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_PHONE(phone)
    );
    return parseCustomer((response as { data: ApiResponseData }).data);
  }
}
