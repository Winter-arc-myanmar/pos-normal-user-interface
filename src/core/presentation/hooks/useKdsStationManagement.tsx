import { useCallback, useState } from "react";
import {
  CreateKdsStationDTO,
  KdsStationFilterDTO,
  UpdateKdsStationDTO,
} from "../../application/dtos/KdsStationDTO";
import { KdsStation } from "../../domain/entities/KdsStation";
import { IKdsStationService } from "../../domain/services/IKdsStationService";
import container from "../../infrastructure/di/container";

export function useKdsStationManagement() {
  const service = container.resolve<IKdsStationService>("kdsStationService");
  const [stations, setStations] = useState<KdsStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "KDS station request failed");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listStations = useCallback(
    async (params?: KdsStationFilterDTO) =>
      run(async () => {
        const result = await service.list(params);
        setStations(result.stations);
        return result;
      }),
    [run, service]
  );

  const createStation = useCallback(
    (payload: CreateKdsStationDTO) =>
      run(async () => {
        const created = await service.create(payload);
        setStations((current) => [created, ...current]);
        return created;
      }),
    [run, service]
  );

  const updateStation = useCallback(
    (id: string, payload: UpdateKdsStationDTO) =>
      run(async () => {
        const updated = await service.update(id, payload);
        setStations((current) =>
          current.map((station) => (station.id === id ? updated : station))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteStation = useCallback(
    (id: string) =>
      run(async () => {
        const deleted = await service.delete(id);
        setStations((current) => current.filter((station) => station.id !== id));
        return deleted;
      }),
    [run, service]
  );

  return {
    stations,
    isLoading,
    error,
    listStations,
    createStation,
    updateStation,
    deleteStation,
  };
}
