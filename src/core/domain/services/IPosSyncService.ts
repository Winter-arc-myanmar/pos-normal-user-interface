import {
  PosSyncActionResultDTO,
  PosSyncContextDTO,
} from "../../application/dtos/PosSyncDTO";

export interface IPosSyncService {
  pullLatestSettings(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO>;
  pullItemUpdates(context: PosSyncContextDTO): Promise<PosSyncActionResultDTO>;
  uploadOrders(context: PosSyncContextDTO): Promise<PosSyncActionResultDTO>;
  restartService(context: PosSyncContextDTO): Promise<PosSyncActionResultDTO>;
}
