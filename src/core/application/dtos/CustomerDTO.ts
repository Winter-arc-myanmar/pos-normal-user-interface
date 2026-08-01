import { Customer } from "../../domain/entities/Customer";

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CustomerResponseDTO {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDomainListResponseDTO {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CustomerFilterDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class CustomerDTOMapper {
  static toResponseDTO(customer: Customer): CustomerResponseDTO {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  static toDomainListResponseDTO(
    customers: Customer[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  ): CustomerDomainListResponseDTO {
    return {
      customers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };
  }

  static fromUpdateDTO(dto: UpdateCustomerDTO): Partial<Customer> {
    const updateData: Partial<Customer> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.address !== undefined) updateData.address = dto.address;

    return updateData;
  }
}
