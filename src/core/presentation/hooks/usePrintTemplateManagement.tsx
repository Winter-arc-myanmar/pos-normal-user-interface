import { useCallback, useState } from "react";
import {
  CreatePrintTemplateDTO,
  PrintTemplateFilterDTO,
  ResolvePrintTemplateDTO,
  UpdatePrintTemplateDTO,
} from "../../application/dtos/PrintTemplateDTO";
import { PrintTemplate } from "../../domain/entities/PrintTemplate";
import { IPrintTemplateService } from "../../domain/services/IPrintTemplateService";
import container from "../../infrastructure/di/container";

export function usePrintTemplateManagement() {
  const service = container.resolve<IPrintTemplateService>("printTemplateService");
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Print template request failed"
      );
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listTemplates = useCallback(
    async (params?: PrintTemplateFilterDTO) =>
      run(async () => {
        const result = await service.list(params);
        setTemplates(result.templates);
        return result;
      }),
    [run, service]
  );

  const resolveTemplate = useCallback(
    (params: ResolvePrintTemplateDTO) => run(() => service.resolve(params)),
    [run, service]
  );

  const createTemplate = useCallback(
    (payload: CreatePrintTemplateDTO) =>
      run(async () => {
        const created = await service.create(payload);
        setTemplates((current) => [created, ...current]);
        return created;
      }),
    [run, service]
  );

  const updateTemplate = useCallback(
    (id: string, payload: UpdatePrintTemplateDTO) =>
      run(async () => {
        const updated = await service.update(id, payload);
        setTemplates((current) =>
          current.map((template) => (template.id === id ? updated : template))
        );
        return updated;
      }),
    [run, service]
  );

  const deleteTemplate = useCallback(
    (id: string) =>
      run(async () => {
        const deleted = await service.delete(id);
        setTemplates((current) => current.filter((template) => template.id !== id));
        return deleted;
      }),
    [run, service]
  );

  return {
    templates,
    isLoading,
    error,
    listTemplates,
    resolveTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    clearError: () => setError(null),
  };
}
