import { useCallback, useState } from "react";
import {
  CreateDiningTableDTO,
  DiningTableFilterDTO,
  DiningTableStatus,
  UpdateDiningTableDTO,
} from "../../application/dtos/CashierDTO";
import { DiningTable, DiningZone } from "../../domain/entities/Cashier";
import { ICashierService } from "../../domain/services/ICashierService";
import container from "../../infrastructure/di/container";

export function useDiningTableManagement() {
  const service = container.resolve<ICashierService>("cashierService");
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [zones, setZones] = useState<DiningZone[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dining table request failed");
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const replaceTable = useCallback((table: DiningTable) => {
    setTables((current) =>
      current.map((item) => (item.id === table.id ? table : item))
    );
  }, []);

  const listZones = useCallback(
    () =>
      run(async () => {
        const result = await service.getDiningZones();
        setZones(result);
        return result;
      }),
    [run, service]
  );

  const listTables = useCallback(
    (params?: DiningTableFilterDTO) =>
      run(async () => {
        const result = await service.listDiningTables(params);
        setTables(result.tables);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        return result;
      }),
    [run, service]
  );

  const createTable = useCallback(
    (payload: CreateDiningTableDTO) =>
      run(async () => {
        const created = await service.createDiningTable(payload);
        setTables((current) => [created, ...current]);
        setTotal((current) => current + 1);
        return created;
      }),
    [run, service]
  );

  const updateTable = useCallback(
    (id: string, payload: UpdateDiningTableDTO) =>
      run(async () => {
        const updated = await service.updateDiningTable(id, payload);
        replaceTable(updated);
        return updated;
      }),
    [replaceTable, run, service]
  );

  const changeStatus = useCallback(
    (id: string, status: DiningTableStatus) =>
      run(async () => {
        const updated = await service.updateDiningTableStatus(id, status);
        replaceTable(updated);
        return updated;
      }),
    [replaceTable, run, service]
  );

  const deleteTable = useCallback(
    (id: string) =>
      run(async () => {
        const deleted = await service.deleteDiningTable(id);
        setTables((current) => current.filter((table) => table.id !== id));
        setTotal((current) => Math.max(0, current - 1));
        return deleted;
      }),
    [run, service]
  );

  return {
    tables,
    zones,
    page,
    totalPages,
    total,
    isLoading,
    error,
    listZones,
    listTables,
    createTable,
    updateTable,
    changeStatus,
    deleteTable,
  };
}
