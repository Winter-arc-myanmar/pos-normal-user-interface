import { useCallback, useState } from "react";
import {
  CreateKitchenPrinterDTO,
  KitchenPrinterFilterDTO,
  UpdateKitchenPrinterDTO,
} from "../../application/dtos/KitchenPrinterDTO";
import { KitchenPrinter } from "../../domain/entities/KitchenPrinter";
import { IKitchenPrinterService } from "../../domain/services/IKitchenPrinterService";
import container from "../../infrastructure/di/container";

export function useKitchenPrinterManagement() {
  const service =
    container.resolve<IKitchenPrinterService>("kitchenPrinterService");
  const [printers, setPrinters] = useState<KitchenPrinter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Kitchen printer request failed"
      );
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listPrinters = useCallback(
    async (params?: KitchenPrinterFilterDTO) =>
      run(async () => {
        const result = await service.list(params);
        setPrinters(result.printers);
        return result;
      }),
    [run, service]
  );

  const createPrinter = useCallback(
    (payload: CreateKitchenPrinterDTO) =>
      run(async () => {
        const created = await service.create(payload);
        setPrinters((current) => [created, ...current]);
        return created;
      }),
    [run, service]
  );

  const updatePrinter = useCallback(
    (id: string, payload: UpdateKitchenPrinterDTO) =>
      run(async () => {
        const updated = await service.update(id, payload);
        setPrinters((current) =>
          current.map((printer) => (printer.id === id ? updated : printer))
        );
        return updated;
      }),
    [run, service]
  );

  const deletePrinter = useCallback(
    (id: string) =>
      run(async () => {
        const deleted = await service.delete(id);
        setPrinters((current) => current.filter((printer) => printer.id !== id));
        return deleted;
      }),
    [run, service]
  );

  const attachCategory = useCallback(
    (id: string, categoryId: string) =>
      run(() => service.attachCategory(id, categoryId)),
    [run, service]
  );

  const detachCategory = useCallback(
    (id: string, categoryId: string) =>
      run(() => service.detachCategory(id, categoryId)),
    [run, service]
  );

  return {
    printers,
    isLoading,
    error,
    listPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    attachCategory,
    detachCategory,
    clearError: () => setError(null),
  };
}
