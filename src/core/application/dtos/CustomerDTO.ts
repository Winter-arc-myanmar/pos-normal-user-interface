import { Customer, CustomerInteraction } from "../../domain/entities/Customer";

export interface CreateCustomerDTO {
  name: string;
  tenantId: string;
  phone?: string;
  email?: string;
  accountType?: string;
  hasCreditAccount?: boolean;
  maxCreditLimit?: string;
  paymentTermsDays?: number;
  loyaltyTier?: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  tenantId?: string;
  phone?: string;
  email?: string;
  accountType?: string;
  hasCreditAccount?: boolean;
  maxCreditLimit?: string;
  paymentTermsDays?: number;
  loyaltyTier?: string;
}

export interface CustomerFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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

export interface CreateCustomerInteractionDTO {
  tenantId: string;
  agentId?: string;
  interactionChannel: string;
  interactionType: string;
  summary: string;
  detailedNotes?: string;
  externalReferenceId?: string;
}

export interface UpdateCustomerInteractionDTO {
  tenantId?: string;
  agentId?: string;
  interactionChannel?: string;
  interactionType?: string;
  summary?: string;
  detailedNotes?: string;
  externalReferenceId?: string;
}

export interface CustomerInteractionFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  customerId?: string;
  interactionType?: string;
  interactionChannel?: string;
}

export interface CustomerInteractionListResponseDTO {
  interactions: CustomerInteraction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
