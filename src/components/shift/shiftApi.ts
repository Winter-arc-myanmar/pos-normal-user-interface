import container from "@/core/infrastructure/di/container";
import type { ApiShiftRepository } from "@/core/infrastructure/repositories/ApiShiftRepository";

export const shiftApi = () => container.resolve<ApiShiftRepository>("shiftRepository");

export const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const errorText = (caught: unknown, fallback: string) =>
  caught instanceof Error && caught.message ? caught.message : fallback;
