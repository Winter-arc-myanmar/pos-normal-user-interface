import {
  CreateKdsStationDTO,
  KdsStationFilterDTO,
  KdsStationListDTO,
  UpdateKdsStationDTO,
} from "../dtos/KdsStationDTO";
import { KdsStation } from "../../domain/entities/KdsStation";
import { IKdsStationRepository } from "../../domain/repositories/IKdsStationRepository";
import { IKdsStationService } from "../../domain/services/IKdsStationService";

export class KdsStationService implements IKdsStationService {
  constructor(private readonly repository: IKdsStationRepository) {}

  list(params?: KdsStationFilterDTO): Promise<KdsStationListDTO> {
    return this.repository.list(params);
  }

  getById(id: string): Promise<KdsStation> {
    if (!id.trim()) throw new Error("KDS station ID is required");
    return this.repository.getById(id);
  }

  create(payload: CreateKdsStationDTO): Promise<KdsStation> {
    if (!payload.tenantId.trim() || !payload.locationId.trim()) {
      throw new Error("Tenant and location are required");
    }
    if (!payload.name.trim()) throw new Error("KDS station name is required");
    return this.repository.create({
      ...payload,
      name: payload.name.trim(),
      routingRules: {
        categoryIds: payload.routingRules.categoryIds.filter((id) => id.trim()),
      },
    });
  }

  update(id: string, payload: UpdateKdsStationDTO): Promise<KdsStation> {
    if (!id.trim()) throw new Error("KDS station ID is required");
    return this.repository.update(id, {
      ...payload,
      name: payload.name?.trim(),
      routingRules: payload.routingRules
        ? {
            categoryIds: payload.routingRules.categoryIds.filter((item) =>
              item.trim()
            ),
          }
        : undefined,
    });
  }

  delete(id: string): Promise<KdsStation> {
    if (!id.trim()) throw new Error("KDS station ID is required");
    return this.repository.delete(id);
  }
}
