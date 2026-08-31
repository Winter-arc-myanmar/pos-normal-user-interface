export interface PosSyncContextDTO {
  tenantId: string;
  locationId?: string;
  posRegisterId?: string;
  posSessionId?: string;
}

export interface PosSyncActionResultDTO {
  success: boolean;
  message?: string;
  completedAt: string;
}
