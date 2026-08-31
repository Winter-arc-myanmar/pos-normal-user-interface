import { IPosSyncRepository } from "../../domain/repositories/IPosSyncRepository";
import {
  PosSyncActionResultDTO,
  PosSyncContextDTO,
} from "../dtos/PosSyncDTO";
import { IPosSyncService } from "../../domain/services/IPosSyncService";

export class PosSyncService implements IPosSyncService {
  constructor(private posSyncRepository: IPosSyncRepository) {}

  private ensureContext(context: PosSyncContextDTO) {
    if (!context.tenantId?.trim()) {
      throw new Error("Tenant is required for POS sync");
    }
  }

  async pullLatestSettings(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    this.ensureContext(context);
    return this.posSyncRepository.pullLatestSettings(context);
  }

  async pullItemUpdates(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    this.ensureContext(context);
    return this.posSyncRepository.pullItemUpdates(context);
  }

  async uploadOrders(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    this.ensureContext(context);
    return this.posSyncRepository.uploadOrders(context);
  }

  async restartService(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    this.ensureContext(context);
    return this.posSyncRepository.restartService(context);
  }
}
