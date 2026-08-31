import {
  PosSyncActionResultDTO,
  PosSyncContextDTO,
} from "../../application/dtos/PosSyncDTO";
import { IPosSyncRepository } from "../../domain/repositories/IPosSyncRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return unwrap((response as ApiEnvelope<T>).data as T);
  }
  return response as T;
};

const toResult = (
  response: unknown,
  fallbackMessage: string
): PosSyncActionResultDTO => {
  const envelope = response as ApiEnvelope<Record<string, unknown>>;
  const data = unwrap(response) as Record<string, unknown> | undefined;
  const completedAt = String(
    data?.completedAt || data?.syncedAt || new Date().toISOString()
  );

  return {
    success: envelope?.success ?? true,
    message: String(envelope?.message || data?.message || fallbackMessage),
    completedAt,
  };
};

export class ApiPosSyncRepository implements IPosSyncRepository {
  constructor(private httpClient: HttpClient) {}

  async pullLatestSettings(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.POS_SYNC.PULL_SETTINGS,
      context
    );
    return toResult(response, "Settings sync completed");
  }

  async pullItemUpdates(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.POS_SYNC.PULL_ITEMS,
      context
    );
    return toResult(response, "Item sync completed");
  }

  async uploadOrders(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.POS_SYNC.UPLOAD_ORDERS,
      context
    );
    return toResult(response, "Order upload completed");
  }

  async restartService(
    context: PosSyncContextDTO
  ): Promise<PosSyncActionResultDTO> {
    const response = await this.httpClient.post(
      API_ENDPOINTS.POS_SYNC.RESTART_SERVICE,
      context
    );
    return toResult(response, "Service restart requested");
  }
}
