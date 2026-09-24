import { KdsRoutingRules, KdsStation } from "../../domain/entities/KdsStation";

export interface KdsStationFilterDTO {
  page?: number;
  limit?: number;
  search?: string;
  locationId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateKdsStationDTO {
  tenantId: string;
  locationId: string;
  name: string;
  displayColor?: string;
  printerId?: string;
  routingRules: KdsRoutingRules;
}

export interface UpdateKdsStationDTO {
  locationId?: string;
  name?: string;
  displayColor?: string;
  printerId?: string;
  routingRules?: KdsRoutingRules;
}

export interface KdsStationListDTO {
  stations: KdsStation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
